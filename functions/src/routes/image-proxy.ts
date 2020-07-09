import * as express from 'express';
import * as request from 'request';
import * as url from 'url';

export const imageProxyRouter = express.Router();

imageProxyRouter.get('/', (req: express.Request, res: express.Response) => {
    const url_parts = url.parse(req.url, true);
    const query = url_parts.query;

    request({ url: query.url, encoding: null }, (err, resp, buffer) => {

    });
});
