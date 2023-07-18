use serde::Serialize;
use thiserror::Error;
use ts_rs::TS;
#[derive(Debug, Error, Copy, Clone, PartialEq, Eq, Serialize, TS)]
#[ts(export, export_to = "target/bindings/")]
#[serde(rename_all = "camelCase")]
pub enum ErrorCode {
    #[error("Intialization failed")]
    InitializationFailed,
    #[error("Bad request")]
    BadRequest,
    #[error("Invalid invoice")]
    InvalidInvoice,
    #[error("Invalid Mnemonic")]
    InvalidMnemonic,
    #[error("Social backup and recovery is not supported for this version of federation")]
    SocialRecoveryNotSupported,
}

pub fn get_error_code(err: &anyhow::Error) -> Option<ErrorCode> {
    err.downcast_ref().cloned()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn can_add_error() {
        let err = anyhow::anyhow!("Hello world").context(ErrorCode::InitializationFailed);
        let code = get_error_code(&err);
        assert_eq!(code, Some(ErrorCode::InitializationFailed));
    }
}
