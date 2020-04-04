const aws = require('aws-sdk');

const docClient = new aws.DynamoDB.DocumentClient();

const loginHashCheck = loginHash => {
    const params = {
        TableName: "gps",
        ProjectionExpression: "email, hashExpires",
        FilterExpression: "#hs = :inputHashString",
        ExpressionAttributeNames: {
            "#hs": "hashString",
        },
        ExpressionAttributeValues: {
             ":inputHashString": loginHash
        }
    };

    console.log(`Hash sent ${loginHash}`);

    return new Promise((resolve, reject) => {
        docClient.scan(params, async (err, res) => {
            if (!err){
                const item = res.Items[0];
                resolve(item);
            } else {
                reject(err);
            }
        });
    });
};

exports.handler = async (event) => {
    return new Promise(async (resolve, reject) => {

        let response = {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': "*",
                'Access-Control-Allow-Methods': 'GET',
                'Content-type' : 'application/json'
            },
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

        const doneUrl = (err, url) => {
            if (!err){
                response.body = JSON.stringify({ "url": url });
                resolve(response);
            } else {
                response.body = err.message;
                response.statusCode = 400;
                reject(response);
            }
        }

        const s3 = new aws.S3({apiVersion: '2006-03-01', signatureVersion: 'v4', region: 'eu-west-2'});

        const bucketName = "gp-sharing-bucket";

        switch (event.httpMethod) {
            case 'GET':
                const documentToFetch = event.queryStringParameters.document;

                const credentialError = (err) => {
                    response.body = err;
                    response.statusCode = 401;
                    reject(response);
                }

                const loginHash = event.queryStringParameters.hash;
                if (loginHash){
                    const userItem = await loginHashCheck(loginHash);
                    if (!userItem){
                        credentialError('No credentials found for: ' + loginHash);
                    } else {
                        console.log(`${userItem.email} has accessed document: ${documentToFetch}`);
                    }
                } else {
                    credentialError('No login hash found');
                }

                const params = {
                  Bucket: bucketName,
                  Key: documentToFetch,
                  Expires: 30
                };

                const url = s3.getSignedUrl('getObject', params);

                console.log(url);
                doneUrl(null, url);
                break;
            default:
                doneUrl(new Error(`Unsupported method "${event.httpMethod}"`));
        }
    });
}
