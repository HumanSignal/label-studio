import React, { useCallback, useEffect, useState } from 'react';
import { observer } from 'mobx-react';
import { types } from 'mobx-state-tree';

import Registry from '../../core/Registry';
import Types from '../../core/Types';
import Tree from '../../core/Tree';
import { Pagination } from '../../common/Pagination/Pagination';
import { Hotkey } from '../../core/Hotkey';
import { FF_DEV_1170, isFF } from '../../utils/feature-flags';
import { AnnotationMixin } from '../../mixins/AnnotationMixin';

const Model = types.model({
  id: types.identifier,
  type: 'pagedview',
  children: Types.unionArray([
    'view',
    'header',
    'labels',
    'label',
    'table',
    'taxonomy',
    'choices',
    'choice',
    'collapse',
    'datetime',
    'number',
    'rating',
    'ranker',
    'cube',
    'rectangle',
    'ellipse',
    'polygon',
    'keypoint',
    'brush',
    'magicwand',
    'cubelabels',
    'rectanglelabels',
    'ellipselabels',
    'polygonlabels',
    'keypointlabels',
    'brushlabels',
    'hypertextlabels',
    'timeserieslabels',
    'text',
    'audio',
    'image',
    'hypertext',
    'richtext',
    'timeseries',
    'audioplus',
    'list',
    'dialog',
    'textarea',
    'pairwise',
    'style',
    'label',
    'relations',
    'filter',
    'timeseries',
    'timeserieslabels',
    'pagedview',
    'paragraphs',
    'paragraphlabels',
    'video',
    'videorectangle',
    'object3d',
  ]),
});

const PagedViewModel = types.compose('PagedViewModel', Model, AnnotationMixin);
const PAGE_QUERY_PARAM = 'view_page';
const hotkeys = Hotkey('Repeater');
const DEFAULT_PAGE_SIZE = 1;
const PAGE_SIZE_OPTIONS = [1, 5, 10, 25, 50, 100];

const getStoredPageSize = (name, defaultValue) => {
  const value = localStorage.getItem(`pages:${name}`);

  if (value) {
    return parseInt(value);
  }

  return defaultValue ?? undefined;
};

const setStoredPageSize = (name, pageSize) => {
  localStorage.setItem(`pages:${name}`, pageSize.toString());
};

const getQueryPage = () => {
  const params = new URLSearchParams(window.location.search);
  const page = params.get(PAGE_QUERY_PARAM);

  if (page) {
    return parseInt(page);
  }

  return 1;
};

let lastTaskId = null;

const updateQueryPage = (page, currentTaskId = null) => {
  const params = new URLSearchParams(window.location.search);

  const taskIdChanged = currentTaskId !== lastTaskId;
  const resetPage = lastTaskId && taskIdChanged;

  lastTaskId = currentTaskId;

  if (resetPage) {
    params.delete(PAGE_QUERY_PARAM);
  } else if (page !== 1) {
    params.set(PAGE_QUERY_PARAM, page.toString());
  } else {
    params.delete(PAGE_QUERY_PARAM);
  }

  window.history.replaceState(undefined, undefined, `${window.location.pathname}?${params}`);
};

const HtxPagedView = observer(({ item }) => {
  const [page, _setPage] = useState(getQueryPage);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const setPage = useCallback((_page) => {
    _setPage(_page);
    updateQueryPage(_page, item.annotationStore?.store?.task.id);
  },[]);

  const totalPages = Math.ceil(item.children.length / pageSize);

  useEffect(() => {
    setPageSize(getStoredPageSize('repeater', DEFAULT_PAGE_SIZE));
  }, []);

  useEffect(() => {
    const last = item.annotation.lastSelectedRegion;

    if (last) {
      const _pageNumber = parseFloat(last.object.name.split('_')[1]) + 1;

      setPage(Math.ceil(_pageNumber / pageSize));
    }
  }, [item.annotation.lastSelectedRegion]);

  useEffect(() => {
    if (isFF(FF_DEV_1170)) {
      document.querySelector('.lsf-sidepanels__content')?.scrollTo(0, 0);
    } else {
      document.querySelector('#label-studio-dm')?.scrollTo(0, 0);
    }

    setTimeout(() => {
      hotkeys.addNamed('repeater:next-page', () => {
        if (page < totalPages) {
          setPage(page + 1);
        }
      });

      hotkeys.addNamed('repeater:previous-page', () => {
        if (page > 1) {
          setPage(page - 1);
        }
      });
    });

    return () => {
      hotkeys.removeNamed('repeater:next-page');
      hotkeys.removeNamed('repeater:previous-page');
    };
  }, [page]);

  useEffect(() => {
    updateQueryPage(getQueryPage(), item.annotationStore?.store?.task.id);
    return () => {
      updateQueryPage(1, item.annotationStore?.store?.task.id);
    };
  }, []);

  const renderPage = useCallback(() => {
    const pageView = [];

    for (let i = 0; i < pageSize; i++) {
      pageView.push(Tree.renderChildren(item.children[i + (pageSize * (page - 1))], item.annotation));
    }

    return pageView;
  }, [page, pageSize]);

  return (
    <div>
      {renderPage()}
      <Pagination
        currentPage={page}
        totalPages={totalPages}
        pageSize={pageSize}
        pageSizeOptions={ PAGE_SIZE_OPTIONS }
        pageSizeSelectable={false}
        size={'medium'}
        onChange={(page, maxPerPage = pageSize) => {
          item.annotation.unselectAll();
          setPage(page);
          if (maxPerPage !== pageSize) {
            setStoredPageSize('repeater', maxPerPage);
            setPageSize(maxPerPage);
          }
        }}
      />
    </div>
  );
});

Registry.addTag('pagedview', PagedViewModel, HtxPagedView);

export { HtxPagedView, PagedViewModel };

