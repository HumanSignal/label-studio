"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
from enum import Enum
from typing import List, Optional, Union
from pydantic import BaseModel, StrictInt, StrictFloat, StrictStr, StrictBool, ConstrainedList


class FilterIn(BaseModel):
    min: Union[StrictInt, StrictFloat, StrictStr]
    max: Union[StrictInt, StrictFloat, StrictStr]


class Filter(BaseModel):
    filter: str
    operator: str
    type: str
    value: Union[StrictInt, StrictFloat, StrictBool, StrictStr, FilterIn, list]


class ConjunctionEnum(Enum):
    OR = 'or'
    AND = 'and'


class Filters(BaseModel):
    conjunction: ConjunctionEnum
    items: List[Filter]


class SelectedItems(BaseModel):
    all: bool
    included: List[int] = []
    excluded: List[int] = []


class PrepareParams(BaseModel):
    project: int
    ordering: List[str] = []
    selectedItems: Optional[SelectedItems] = None
    filters: Optional[Filters] = None
    data: Optional[dict] = None
