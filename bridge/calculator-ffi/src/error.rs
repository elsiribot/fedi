#[derive(Debug, thiserror::Error, Copy, Clone, PartialEq, Eq)]
#[repr(u32)]
pub enum ErrorCode {
    #[error("Intialization failed")]
    InitializationFailed = 1,
    #[error("Bad request")]
    BadRequest = 2,
    #[error("Invalid invoice")]
    InvalidInvoice = 3,
    #[error("Invalid Mnemonic")]
    InvalidMnemonic = 4,
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
