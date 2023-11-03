use std::collections::BTreeMap;

pub use fedi_social_common::*;
use fedimint_client_v2::module::init::{ClientModuleInit, ClientModuleInitArgs};
use fedimint_client_v2::module::ClientModule;
use fedimint_client_v2::sm::{DynState, State, StateTransition};
use fedimint_client_v2::DynGlobalClientContext;
use fedimint_core_v2::core::{IntoDynInstance, ModuleInstanceId, OperationId};
use fedimint_core_v2::db::ModuleDatabaseTransaction;
use fedimint_core_v2::encoding::{Decodable, Encodable};
use fedimint_core_v2::module::{ApiVersion, ExtendsCommonModuleInit, MultiApiVersion};
use fedimint_core_v2::{apply, async_trait_maybe_send};

#[derive(Debug, Clone)]
pub struct FediSocialClientInit;

#[apply(async_trait_maybe_send!)]
impl ExtendsCommonModuleInit for FediSocialClientInit {
    type Common = FediSocialCommonGen;

    // No client-side database for social recovery
    async fn dump_database(
        &self,
        _dbtx: &mut ModuleDatabaseTransaction<'_>,
        _prefix_names: Vec<String>,
    ) -> Box<dyn Iterator<Item = (String, Box<dyn erased_serde::Serialize + Send>)> + '_> {
        Box::new(BTreeMap::new().into_iter())
    }
}

#[apply(async_trait_maybe_send!)]
impl ClientModuleInit for FediSocialClientInit {
    type Module = FediSocialClientModule;

    fn supported_api_versions(&self) -> MultiApiVersion {
        MultiApiVersion::try_from_iter([ApiVersion { major: 0, minor: 0 }])
            .expect("no version conficts")
    }

    async fn init(&self, _args: &ClientModuleInitArgs<Self>) -> anyhow::Result<Self::Module> {
        Ok(FediSocialClientModule {})
    }
}

#[derive(Debug)]
pub struct FediSocialClientModule {}

impl ClientModule for FediSocialClientModule {
    type Common = FediSocialModuleTypes;
    type ModuleStateMachineContext = ();
    type States = FediSocialClientStates;

    fn context(&self) -> Self::ModuleStateMachineContext {}

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
