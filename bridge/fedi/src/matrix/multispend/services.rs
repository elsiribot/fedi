use std::sync::Arc;

use super::completion_notification_service::CompletionNotificationService;
use super::withdrawal_service::WithdrawalService;
use crate::bridge_runtime::BridgeRuntime;

pub struct MultispendServices {
    pub withdrawal: WithdrawalService,
    pub completion_notification: CompletionNotificationService,
}

impl MultispendServices {
    pub fn new(runtime: Arc<BridgeRuntime>) -> Arc<Self> {
        Arc::new(Self {
            withdrawal: WithdrawalService::default(),
            completion_notification: CompletionNotificationService::new(runtime),
        })
    }
}
