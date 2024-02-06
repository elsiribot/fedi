use eyeball_im::VectorDiff;
use imbl::Vector;
use serde::Serialize;

use crate::serde::{SerdeAs, SerdeVectorDiff};

pub type ObservableVec<T> = Observable<Vector<T>>;
pub type ObservableVecUpdate<T> =
    ObservableUpdate<SerdeAs<Vec<VectorDiff<T>>, Vec<SerdeVectorDiff<T>>>>;

// just for ts exporting
mod __hidden {
    use super::*;

    #[derive(Debug, Clone, ts_rs::TS)]
    #[ts(export, export_to = "target/bindings/")]
    pub struct ObservableVec<T>(Observable<Vec<T>>);

    #[derive(Debug, Clone, ts_rs::TS)]
    #[ts(export, export_to = "target/bindings/")]
    pub struct ObservableVecUpdate<T: Clone>(ObservableUpdate<Vec<SerdeVectorDiff<T>>>);
}

#[derive(Debug, Serialize, Clone, ts_rs::TS)]
#[ts(export, export_to = "target/bindings/")]
pub struct Observable<T> {
    // 2^53 is pretty big for number of observable objects
    #[ts(type = "number")]
    pub id: u64,
    pub initial: T,
}

impl<T> Observable<T> {
    pub fn new(id: u64, initial: T) -> Self {
        Self { id, initial }
    }
}

#[derive(Serialize, Clone, Debug, ts_rs::TS)]
#[ts(export, export_to = "target/bindings/")]
pub struct ObservableUpdate<T> {
    /// matches the `id` in ObservableVector
    #[ts(type = "number")]
    pub id: u64,
    #[ts(type = "number")]
    pub update_index: u64,
    pub update: T,
}

impl<T> ObservableUpdate<T> {
    pub fn new(id: u64, update_index: u64, update: T) -> Self {
        Self {
            id,
            update_index,
            update,
        }
    }
}

impl<T: Clone> ObservableVecUpdate<T> {
    pub fn new_diffs(id: u64, update_index: u64, diffs: Vec<VectorDiff<T>>) -> Self {
        Self::new(id, update_index, SerdeAs::new(diffs))
    }
}
