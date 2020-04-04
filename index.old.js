const aws = require('aws-sdk');

exports.handler = async (event) => {
    return new Promise((resolve, reject) => {

        let response = {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': "*",
                'Access-Control-Allow-Methods': 'GET, POST',
                'Content-type' : 'application/octet-stream'
            },
            isBase64Encoded: true,
            body: ''
        };

        const done = (err, res, filename) => {
            if (!err){
                response.body = Buffer.from(res.Body).toString('base64');
                response.headers['Content-Disposition'] = 'inline; filename="' + filename + '"';
                resolve(response);
            } else {
                response.body = err.message;
                response.statusCode = 400;
                reject(response);
            }
        }

        const s3 = new aws.S3({apiVersion: '2006-03-01'});

        const bucketName = "gp-sharing-bucket";

        switch (event.httpMethod) {
            case 'GET':
                const documentToFetch = event.queryStringParameters.document;

                let params = {
                  Bucket: bucketName,
                  Key: documentToFetch
                };

                s3.getObject(params, function(err, data) {
                    done(err, data, documentToFetch);
                });
                break;
            case 'PUT':

                break;
            default:
                done(new Error(`Unsupported method "${event.httpMethod}"`));
        }
    });
}
