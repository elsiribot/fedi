use serde::Serialize;
use thiserror::Error;
use ts_rs::TS;
#[derive(Debug, Error, Copy, Clone, PartialEq, Eq, Serialize, TS)]
#[ts(export, export_to = "target/bindings/")]
#[serde(rename_all = "camelCase")]
pub enum ErrorCode {
    #[error("Intialization failed")]
    InitializationFailed,
    #[error("Not initialized")]
    NotInialized,
    #[error("Bad request")]
    BadRequest,
    #[error("Already joined this federation")]
    AlreadyJoined,
    #[error("Invalid invoice")]
    InvalidInvoice,
    #[error("Invalid Mnemonic")]
    InvalidMnemonic,
    #[error("Ecash cancel failed, the e-cash notes have been spent by someone else already")]
    EcashCancelFailed,
    #[error("Social backup and recovery is not supported for this version of federation")]
    SocialRecoveryNotSupported,
    #[error("Nostr events not supported for this version of federation")]
    NostrNotSupported,
    #[error("Bridge panicked")]
    Panic,
    #[error("Not supported for this version of federation")]
    NotSupportedInVersion,
    #[error("Stability pool module not supported for this version of federation")]
    StabilityPoolNotSupported,
    #[error("Invalid social recovery file")]
    InvalidSocialRecoveryFile,
}

pub fn get_error_code(err: &anyhow::Error) -> Option<ErrorCode> {
    err.downcast_ref().cloned()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_can_add_error() {
        let err = anyhow::anyhow!("Hello world").context(ErrorCode::InitializationFailed);
        let code = get_error_code(&err);
        assert_eq!(code, Some(ErrorCode::InitializationFailed));
    }

    #[test]
    fn test_just_error_code() {
        let err = anyhow::anyhow!(ErrorCode::InitializationFailed);
        let code = get_error_code(&err);
        assert_eq!(code, Some(ErrorCode::InitializationFailed));
    }
}
