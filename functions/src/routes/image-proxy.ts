import * as express from 'express';
import * as url from 'url';
import * as http from 'http';
import * as https from 'https';
import * as mime from 'mime';
import * as gm from 'gm';

export const imageProxyRouter = express.Router();

const mimeTypes = [
    'image/gif',
    'image/jpeg',
    'image/png',
    'image/jpg',
];

const imageMagick = gm.subClass({ imageMagick: true });

// @ts-ignore
imageProxyRouter.get('/', (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const width = req.query.width as string ?? 120;
    const height = req.query.height as string ?? 120;

    // @ts-ignore
    const retrieve = function (remote: any) {
        const options = url.parse(remote, true);
        (options as any).agent = false;

        if (options.protocol !== 'http:' && options.protocol !== 'https:') {
            return res.status(404).send('Expected URI scheme to be HTTP or HTTPS');
        }

        if (!options.hostname) {
            return res.status(404).send('Expected URI host to be non-empty');
        }

        (options as any).headers = { 'User-Agent': 'tribaldex/0.0.7', 'Accept': '*/*' };

        const agent = options.protocol === 'http:' ? http : https;
        let timeout = false;

        // @ts-ignore
        const request = agent.get(options, function (response) {
            if (timeout) {
                return;
            }

            if ((response.statusCode === 301 || response.statusCode === 302) && response.headers['location']) {
                const redirect = url.parse(response.headers['location']);

                if (!redirect.protocol) {
                    redirect.protocol = options.protocol;
                }

                if (!redirect.hostname) {
                    redirect.hostname = options.hostname;
                }
                if (!redirect.port) {
                    redirect.port = options.port;
                }

                if (!redirect.hash) {
                    redirect.hash = options.hash;
                }

                return retrieve(url.format(redirect));
            }

            if (response.statusCode !== 200) {
                return res.sendFile('./download.png');
                //return res.status(404).send('Expected response code 200, got ' + response.statusCode);
            }

            const mimeType = (response.headers['content-type'] || '').replace(/;.*/, '');
            const extension = mime.getExtension(mimeType) as any;

            if (mimeTypes.indexOf(mimeType) === -1 || !extension) {
                return res.status(404).send('Expected content type ' + mimeTypes.join(', ') + ', got ' + mimeType);
            }

            imageMagick(response, 'image.' + extension)
                .colorspace('RGB')
                .resize(parseInt(width), parseInt(height), '^')
                .stream(extension, function (err: any, stdout: any, stderr: any) {
                    if (err) {
                        return next(err);
                    }

                    stderr.pipe(process.stderr);
                    res.writeHead(200, {
                        'Content-Type': mimeType,
                        'Cache-Control': 'max-age=31536000, public',
                    });

                    stdout.pipe(res);
                });
        }).on('error', next);

        request.setTimeout(5000, function () {
            timeout = true;
            return res.status(504).send();
        });
    }

    if (isNaN(parseInt(width))) {
        return res.status(404).send('Expected width to be an integer');
    }

    if (parseInt(width) > 1000) {
        return res.status(404).send('Expected width to be less than or equal to 1000');
    }

    if (isNaN(parseInt(height))) {
        return res.status(404).send('Expected height to be an integer');
    }

    if (parseInt(height) > 1000) {
        return res.status(404).send('Expected height to be less than or equal to 1000');
    }

    retrieve(decodeURIComponent(req.query.url as string));
});
