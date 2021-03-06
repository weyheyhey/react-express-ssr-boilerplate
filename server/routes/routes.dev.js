import express from 'express';
import { ServerStyleSheet } from 'styled-components';
import { matchRoutes } from 'react-router-config';
import { createMemoryHistory } from 'history';
import serialize from 'serialize-javascript';

import { configureStore } from '../../client/common/store';
import { appRoutes } from '../../client/common/routes';

import { groupWebpackAssets, preloadData } from '../lib';
import { renderApp, renderHtml } from '../render';

export const devRouter = express.Router({});

devRouter.get('*', async (req, res) => {
  const assetsByChunkName = res.locals.webpackStats.toJson().assetsByChunkName; // eslint-disable-line
  const { css: styles, js: scripts } = groupWebpackAssets(assetsByChunkName.bundle);
  const history = createMemoryHistory({ initialEntries: [req.url] });
  const sheet = new ServerStyleSheet();
  const url = req.url.split(/[?#]/)[0];
  const context = {};

  const store = configureStore(history);

  const branch = matchRoutes(appRoutes, url);
  const pendingActions = preloadData(branch, store);

  return Promise.all(pendingActions).then(() => {
    if (context.status === 301 || context.status === 302) {
      return res.redirect(context.url, context.status);
    }

    if (context.status === 404) {
      res.status(404);
    }

    const content = renderApp(store, context, req.url, sheet);
    const styledElement = sheet.getStyleElement();
    const initialValues = `
      window.__INITIAL_STATE__ = ${serialize(store.getState())};
    `;

    return res.send(renderHtml({ content, styles, styledElement, scripts, initialValues }));
  });
});
