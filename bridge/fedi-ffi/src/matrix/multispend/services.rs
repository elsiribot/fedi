use std::sync::Arc;

use super::withdrawal_service::WithdrawalService;

pub struct MultispendServices {
    pub withdrawal: WithdrawalService,
}

impl MultispendServices {
    pub fn new() -> Arc<Self> {
        Arc::new(Self {
            withdrawal: WithdrawalService::default(),
        })
    }
}
