use std::sync::Arc;
use std::time::{Duration, SystemTime};

use anyhow::bail;
use fedimint_core::task::{TaskGroup, TaskHandle};
use futures::FutureExt;
use tracing::{error, info};

use crate::api::{IFediApi, RegisterDeviceError, RegisteredDevice};
use crate::constants::BACKUP_FREQUENCY;
use crate::event::{Event, EventSink, TypedEventExt};
use crate::storage::AppState;

pub struct DeviceRegistrationService {
    // To be able to manually kill the service if needed
    _task_group: TaskGroup,
}

impl DeviceRegistrationService {
    pub async fn new(
        device_identifier: String,
        app_state: Arc<AppState>,
        event_sink: EventSink,
        task_group: TaskGroup,
        fedi_api: Arc<dyn IFediApi>,
    ) -> Self {
        task_group
            .spawn("device_registration_service", move |handle| {
                Self::task(handle, device_identifier, app_state, event_sink, fedi_api)
            })
            .await;
        Self {
            _task_group: task_group,
        }
    }

    async fn task(
        handle: TaskHandle,
        device_identifier: String,
        app_state: Arc<AppState>,
        event_sink: EventSink,
        fedi_api: Arc<dyn IFediApi>,
    ) {
        let mut shutdown = handle.make_shutdown_rx().await.fuse();
        let (seed, device_index) = app_state
            .with_read_lock(|state| (state.root_mnemonic.clone(), state.device_index))
            .await;

        // If a device index is not set in AppState, we first fetch the list of
        // registered devices. If the list comes back as empty, we know we can
        // safely register the current device as index 0. This would be the
        // happy path and would handle the overwhelming majority of cases.
        if device_index.is_none() {
            let registered_devices_fut =
                Self::get_registered_devices_with_backoff(fedi_api.clone(), seed.clone());
            let registered_devices = tokio::select! {
                biased;
                _ = &mut shutdown => {
                    info!("device_registration_service shutting down");
                    return;
                }
                devices = registered_devices_fut => devices
            };

            if registered_devices.is_empty() {
                if let Err(error) = app_state
                    .with_write_lock(|state| state.device_index = Some(0))
                    .await
                {
                    error!(%error, "error updating app state, device_registration_service shutting down");
                    return;
                }

                let register_device_fut = Self::register_device_with_backoff(
                    app_state.clone(),
                    fedi_api.clone(),
                    event_sink.clone(),
                    seed.clone(),
                    0,
                    device_identifier.clone(),
                );
                let register_device_res = tokio::select! {
                    biased;
                    _ = &mut shutdown => {
                        info!("device_registration_service shutting down");
                        return;
                    }
                    res = register_device_fut => res
                };
                if register_device_res.is_err() {
                    return;
                }
            } else {
                // However, if the list does not come back as empty, we check if an existing
                // device matches the current device identifier. If there is a match, we assign
                // that device's index to the current device. But if there is no match, we emit
                // an event to let the UI know that immediate user action is
                // required to successfully register the device with a
                // particular index (as a new device, or by transferring an
                // existing device).
                if let Some(device_match) = registered_devices
                    .iter()
                    .find(|device_info| device_info.identifier == device_identifier)
                {
                    if let Err(error) = app_state
                        .with_write_lock(|state| state.device_index = Some(device_match.index))
                        .await
                    {
                        error!(%error, "error updating app state, device_registration_service shutting down");
                        return;
                    }
                } else {
                    error!("user action required to register device, service shutting down");
                    event_sink.typed_event(&Event::device_registration(
                        crate::event::DeviceRegistrationState::NewDeviceNeedsAssignment,
                    ));
                    return;
                }
            }
        }

        // At this point, we would expect a device index is set in AppState. So we can
        // just start the periodic activity of renewing this device's
        // registration every so often. Should this renewal ever fail because of
        // a conflicting device that's registered with Fedi's servers using the
        // same device index, we emit an event to let the UI know that
        // this device should no longer be used.
        if let Some(device_index) = app_state.with_read_lock(|state| state.device_index).await {
            loop {
                let last_registration_timestamp = app_state
                    .with_read_lock(|state| state.last_device_registration_timestamp)
                    .await
                    .unwrap_or(SystemTime::UNIX_EPOCH);

                let now = fedimint_core::time::now();
                let sleep_duration = if last_registration_timestamp + BACKUP_FREQUENCY
                    < fedimint_core::time::now()
                {
                    Duration::ZERO
                } else {
                    (last_registration_timestamp + BACKUP_FREQUENCY)
                        .duration_since(now)
                        .unwrap_or(Duration::ZERO)
                };
                let sleep_timer = fedimint_core::task::sleep(sleep_duration);

                tokio::select! {
                    biased;
                    _ = &mut shutdown => {
                        info!("device_registration_service shutting down");
                        return;
                    }
                    _ = sleep_timer => ()
                }

                let register_device_fut = Self::register_device_with_backoff(
                    app_state.clone(),
                    fedi_api.clone(),
                    event_sink.clone(),
                    seed.clone(),
                    device_index,
                    device_identifier.clone(),
                );
                let register_device_res = tokio::select! {
                    biased;
                    _ = &mut shutdown => {
                        info!("device_registration_service shutting down");
                        return;
                    }
                    res = register_device_fut => res
                };
                if register_device_res.is_err() {
                    return;
                }
            }
        }
    }

    async fn get_registered_devices_with_backoff(
        fedi_api: Arc<dyn IFediApi>,
        seed: bip39::Mnemonic,
    ) -> Vec<RegisteredDevice> {
        let mut failed_count = 0u64;
        loop {
            match fedi_api
                .fetch_registered_devices_for_seed(seed.clone())
                .await
            {
                Ok(devices) => return devices,
                Err(error) => {
                    error!(%failed_count, %error, "fetch registered devices failed");
                    failed_count += 1;
                }
            }

            // max 512 secs
            let sleep_time = 1 << failed_count.min(9);
            fedimint_core::task::sleep(Duration::from_secs(sleep_time)).await;
        }
    }

    async fn register_device_with_backoff(
        app_state: Arc<AppState>,
        fedi_api: Arc<dyn IFediApi>,
        event_sink: EventSink,
        seed: bip39::Mnemonic,
        device_index: u8,
        device_identifier: String,
    ) -> anyhow::Result<()> {
        let mut failed_count = 0u64;
        loop {
            match fedi_api
                .register_device_for_seed(
                    seed.clone(),
                    device_index,
                    device_identifier.clone(),
                    false,
                )
                .await
            {
                Ok(_) => {
                    info!("successfully registered device with index {device_index}");
                    // AppState write shouldn't fail, but timestamp update is not critical anyway
                    let _ = app_state
                        .with_write_lock(|state| {
                            state.last_device_registration_timestamp =
                                Some(fedimint_core::time::now());
                        })
                        .await;
                    event_sink.typed_event(&Event::device_registration(
                        crate::event::DeviceRegistrationState::Success,
                    ));
                    return Ok(());
                }
                Err(RegisterDeviceError::AnotherDeviceOwnsIndex(error)) => {
                    error!(%error, "unexpected device registration conflict, service shutting down");
                    event_sink.typed_event(&Event::device_registration(
                        crate::event::DeviceRegistrationState::Conflict,
                    ));
                    bail!(error);
                }
                Err(error) => {
                    error!(%failed_count, ?error, "register device failed");
                    event_sink.typed_event(&Event::device_registration(
                        crate::event::DeviceRegistrationState::Overdue,
                    ));
                    failed_count += 1;
                }
            }

            let sleep_time = 1 << failed_count.min(9);
            fedimint_core::task::sleep(Duration::from_secs(sleep_time)).await;
        }
    }
}
