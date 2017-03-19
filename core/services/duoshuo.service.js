var Duoshuo = require('duoshuo');
var bluebird = require('bluebird');
var url = require('url');

var es = require('elasticsearch');
var bodybuilder = require('bodybuilder')
var htmlana = require('crawler-html-analysis');
var duoshuo = new Duoshuo({
    short_name: 'bebewiki',
    secret: 'b31d2df971b59d1aea796fa21b808018'
});

var config = {
    "initDomain": "http://www.yaolan.com/",
    "key": "yaolan",
    "description": "摇篮网的配置文件",
    "urlAnalysis": {
        "queue": {
            "ignoreWWWDomain": false,
            "stripWWWDomain": false,
            "scanSubdomains": false,
            "host": "www.yaolan.com",
            "initialProtocol": "http",
            "initialPort": 80,
            "stripQuerystring": true,
            "fetchConditions": [],
            "domainWhiteList": ["www.yaolan.com"],
            "filterByDomain": true
        },
        "discover": {
            "parseHTMLComments": false,
            "parseScriptTags": false,
            "allowedProtocols": ["http", "https"],
            "whitePathList": [{ "regexp": "/(.*?)/", "scope": "i", "enable": true }],
            "blackPathList": [],
            "userAgent": "",
            "fetchWhitelistedMimeTypesBelowMaxDepth": false,
            "maxDepth": 0,
            "ignoreRobots": false
        }
    },
    "downloader": {
        "proxy": {
            "useProxy": false,
            "httpProxy": "http://10.25.254.241/8081"
        },
        "retry": {
            "count": 2
        },
        "charset": {
            "charset": "utf-8"
        },
        "timeout": {
            "timeout": 25000
        }
    },
    "downloadAnalysis": {

    },
    "htmlAnalysis": {

    },
    "resultStore": {

    },
    "pages": [{
        "key": "health-post",
        "rule": [{ "regexp": "/\\/health\\/\\d+.shtml/", "scope": "i" }],
        "strictFields": ["community"],
        "areas": [

        ],
        "fieldKey": "urlId",
        "strict": false,
        "fields": {
            "none": {
                "data": [{
                    "key": "title",
                    "selector": ["#final_content .sfinal_w:eq(0) h1:eq(0)"],
                    "removeSelector": [],
                    "methodInfo": { "text": [] },
                    "htmlStrategy": "jsdom",
                    "dealStrategy": "normal"
                }, {
                    "key": "content",
                    "selector": ["#content_p"],
                    "removeSelector": [],
                    "methodInfo": { "html": [] },
                    "htmlStrategy": "jsdom",
                    "dealStrategy": "normal"
                }]
            }
        },
        "enabled": true,
        "needFetch": false,
        "needSaveToAllIn": true,
        "checkDiff": false,
        "checkDiffPath": "",
        "aliasKey": ""
    }]
};

exports.signin = duoshuo.signin;
exports.auth = bluebird.promisify(duoshuo.auth).bind(duoshuo);
exports.userInfo = function() {
    return function(req, res, next) {
        if (!req.session.user) return next();
        var client = duoshuo.getClient(req.session.user.access_token);

        if (!client) return next();
        client.get('users/profile.json', {
            qs: {
                user_id: req.session.user.user_id
            }
        }, function(err, res1, body) {
            if (!err) {
                res.locals.userDetail = body;
            }
            next();
        });
    }
};
exports.sso = function(req) {
    // console.log(req.protocol, req.hostname, req.originalUrl);
    // console.log(req.protocol + "://" + req.headers.host + req.originalUrl);
    var from = encodeURIComponent("/login/?from=" + req.protocol + "://" + req.headers.host + req.originalUrl);

    return {
        qq: "http://bebewiki.duoshuo.com/login/qq/?sso=1&redirect_uri=" + from,
        weibo: "http://bebewiki.duoshuo.com/login/weibo/?sso=1&redirect_uri=" + from,
        weixin: "http://bebewiki.duoshuo.com/login/weixin/?sso=1&redirect_uri=" + from
    };
}
let total = 0;

function importsa(client, response) {
    total += response.hits.hits.length;
    console.log(response._scroll_id);
    client.scroll({
        scrollId: response._scroll_id,
        scroll: '30s'
    }, importsa.bind(client));
}

exports.importContent = function() {
    var client = new es.Client({
        host: `106.75.78.203:9200`,
        log: [{
            type: 'stdio',
            levels: ['error', 'warning']
        }]
    });

    var body = bodybuilder()
        .query('regexp', 'path', 'health')
        .query('term', 'statusCode', 200)
        .from(0)
        .size(10)
        .build()

    return function(req, res, next) {
        var allTitles = [];

        client.search({
            index: 'ff.crawler.urls',
            scroll: "30s",
            body: body
        }, function getMoreUntilDone(error, response) {
            response.hits.hits.forEach(function(hit) {
                var ctx = { config: config, queueItem: hit._source, body: {} };

                htmlana.default({})(ctx, function() {
                    ctx.body.htmlAnalysis && ctx.queueItem.analysisResult.forEach(function(analysis) {
                        client.create({
                            index: 'ff.crawler.results',
                            type: config.key,
                            id: hit._id,
                            body: analysis.result
                        });
                    });
                });
            });

            console.log(response._scroll_id);

            if (response.hits.total > allTitles.length) {
                // ask elasticsearch for the next set of hits from this search
                client.scroll({
                    scrollId: response._scroll_id,
                    scroll: '30s'
                }, getMoreUntilDone);
            } else {
                console.log('every "test" title', allTitles);
            }
        });

        next();
    }
}