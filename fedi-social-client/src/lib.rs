pub use fedi_social_common::*;

use fedi_social_common::config::FediSocialClientConfig;
use fedi_social_common::{FediSocialCommonGen, FediSocialModuleTypes};
use fedimint_client::module::gen::ClientModuleGen;
use fedimint_client::module::ClientModule;
use fedimint_client::sm::{DynState, OperationId, State, StateTransition};
use fedimint_client::DynGlobalClientContext;
use fedimint_core::core::{IntoDynInstance, ModuleInstanceId};
use fedimint_core::db::Database;
use fedimint_core::encoding::{Decodable, Encodable};
use fedimint_core::module::ExtendsCommonModuleGen;
use fedimint_core::{apply, async_trait_maybe_send};

#[derive(Debug, Clone)]
pub struct FediSocialClientGen;

impl ExtendsCommonModuleGen for FediSocialClientGen {
    type Common = FediSocialCommonGen;
}

#[apply(async_trait_maybe_send!)]
impl ClientModuleGen for FediSocialClientGen {
    type Module = FediSocialClientModule;
    type Config = FediSocialClientConfig;

    async fn init(&self, _cfg: Self::Config, _db: Database) -> anyhow::Result<Self::Module> {
        unimplemented!()
    }
}

#[derive(Debug)]
pub struct FediSocialClientModule {}

impl ClientModule for FediSocialClientModule {
    type Common = FediSocialModuleTypes;
    type ModuleStateMachineContext = ();
    type States = FediSocialClientStates;

    fn context(&self) -> Self::ModuleStateMachineContext {
        unimplemented!()
    }

    fn input_amount(
        &self,
        _input: &<Self::Common as fedimint_core::module::ModuleCommon>::Input,
    ) -> fedimint_core::module::TransactionItemAmount {
        unimplemented!()
    }

    fn output_amount(
        &self,
        _output: &<Self::Common as fedimint_core::module::ModuleCommon>::Output,
    ) -> fedimint_core::module::TransactionItemAmount {
        unimplemented!()
    }
}

#[derive(Debug, Clone, Eq, PartialEq, Decodable, Encodable)]
pub enum FediSocialClientStates {}

impl IntoDynInstance for FediSocialClientStates {
    type DynType = DynState<DynGlobalClientContext>;

    fn into_dyn(self, instance_id: ModuleInstanceId) -> Self::DynType {
        DynState::from_typed(instance_id, self)
    }
}

impl State for FediSocialClientStates {
    type ModuleContext = ();
    type GlobalContext = DynGlobalClientContext;

    fn transitions(
        &self,
        _context: &Self::ModuleContext,
        _global_context: &Self::GlobalContext,
    ) -> Vec<StateTransition<Self>> {
        unimplemented!()
    }

    fn operation_id(&self) -> OperationId {
        unimplemented!()
    }
}
