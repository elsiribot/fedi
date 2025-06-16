//! Bridge startup can't wait for matrix initialization on startup, so this
//! provides lazy matrix initialzing.

use std::sync::Arc;

use fedimint_derive_secret::ChildId;
use rpc_types::error::RpcError;
use runtime::bridge_runtime::Runtime;
use runtime::constants::{GLOBAL_MATRIX_SERVER, MATRIX_CHILD_ID};
use runtime::observable::Observable;
use serde::{Deserialize, Serialize};
use tokio::sync::{watch, OnceCell};
use ts_rs::TS;

use super::multispend::services::MultispendServices;
use super::Matrix;

#[derive(Clone, Debug, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[serde(tag = "type")]
#[ts(export)]
pub enum MatrixInitializeStatus {
    Starting,
    LoggingIn,
    Success,
    Error { error: RpcError },
}

pub struct BgMatrix {
    initialized: OnceCell<Arc<Matrix>>,
    status: watch::Sender<MatrixInitializeStatus>,
}

impl BgMatrix {
    #[cfg_attr(test, allow(unused_variables))]
    pub fn new(
        runtime: Arc<Runtime>,
        user_name: String,
        multispend_services: Arc<MultispendServices>,
    ) -> Arc<Self> {
        let bg_matrix = Arc::new(Self {
            initialized: OnceCell::new(),
            status: watch::Sender::new(MatrixInitializeStatus::Starting),
        });

        #[cfg(not(test))] // don't start matrix in tests
        runtime
            .task_group
            .clone()
            .spawn_cancellable("BgMatrix::initialize", {
                let bg_matrix = bg_matrix.clone();
                async move {
                    bg_matrix
                        .initialize(runtime, &user_name, multispend_services)
                        .await;
                }
            });

        bg_matrix
    }

    pub async fn observe_status(
        &self,
        runtime: &Runtime,
        observable_id: u64,
    ) -> anyhow::Result<Observable<MatrixInitializeStatus>> {
        let status_rx = self.status.subscribe();

        runtime
            .observable_pool
            .make_observable_from_stream(
                observable_id,
                None,
                tokio_stream::wrappers::WatchStream::new(status_rx),
            )
            .await
    }

    pub async fn initialize(
        &self,
        runtime: Arc<Runtime>,
        user_name: &str,
        multispend_services: Arc<MultispendServices>,
    ) {
        let global_root_secret = runtime.app_state.root_secret().await;
        let matrix_secret = global_root_secret.child_key(ChildId(MATRIX_CHILD_ID));
        let result = Matrix::init(
            runtime.clone(),
            &runtime.storage.platform_path("matrix".as_ref()),
            &matrix_secret,
            user_name,
            GLOBAL_MATRIX_SERVER.to_owned(),
            multispend_services,
            &self.status,
        )
        .await;

        match result {
            Ok(matrix) => {
                assert!(
                    self.initialized.set(matrix).is_ok(),
                    "matrix initialize is only called once"
                );
                self.status.send_replace(MatrixInitializeStatus::Success);
            }
            Err(err) => {
                self.status.send_replace(MatrixInitializeStatus::Error {
                    error: RpcError::from_anyhow(&err),
                });
            }
        }
    }

    pub async fn wait(&self) -> &Arc<Matrix> {
        // important: just hangs on failed starts
        if let Some(matrix) = self.initialized.get() {
            return matrix;
        }

        let mut status_rx = self.status.subscribe();
        status_rx
            .wait_for(|status| matches!(status, MatrixInitializeStatus::Success))
            .await
            .expect("channel must not close because self holds the sender");

        self.initialized
            .get()
            .expect("matrix must be initialized after success status")
    }
}
