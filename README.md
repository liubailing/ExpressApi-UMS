# 项目简介
用户管理系统 APIs

## 相关技术框架
  Node.js, Express , MongoDB , RESTful APIs , 自动化测试 , 自动化部署

## 技术栈

 - ES2017 latest features like Async/Await
 - Uses [yarn](https://yarnpkg.com)
 - Express + MongoDB ([Mongoose](http://mongoosejs.com/))
 - Consistent coding styles with [editorconfig](http://editorconfig.org)
 - [Docker](https://www.docker.com/) support
 - Uses [helmet](https://github.com/helmetjs/helmet) to set some HTTP headers for security, CORS enabled
 - Request validation with [joi](https://github.com/hapijs/joi)
 - Gzip compression with [compression](https://github.com/expressjs/compression)
 - Linting with [eslint](http://eslint.org)
 - Tests with [mocha](https://mochajs.org), [chai](http://chaijs.com) and [sinon](http://sinonjs.org)
 - Code coverage with [istanbul](https://istanbul.js.org) and [coveralls](https://coveralls.io)
 - Git hooks with [husky](https://github.com/typicode/husky) 
 - Logging with [morgan](https://github.com/expressjs/morgan)
 - Authentication and Authorization with [passport](http://passportjs.org)
 - API documentation geratorion with [apidoc](http://apidocjs.com)
 - Continuous integration support with [travisCI](https://x-ci.org)
 - Monitoring with [pm2](https://github.com/Unitech/pm2)

## Requirements

 - [Node v7.6+](https://nodejs.org/en/download/current/) or [Docker](https://www.docker.com/)
 - [Yarn](https://yarnpkg.com/en/docs/install)

## Getting Started

安装依赖:

```bash
yarn
```

Set environment variables:

```bash
cp .env.demo .env                  *必要*
cp .travis.demo.yml .travis.yml    自动化部署,可以忽视
```

## 本地开发调试

```bash
yarn dev
```

## 发布

```bash
yarn start
```

## 代码检测

```bash
# lint code with ESLint
yarn lint

# try to fix ESLint errors
yarn lint:fix

# lint and watch for changes
yarn lint:watch
```

## 代码测试

```bash
# run all tests with Mocha
yarn test

# run unit tests
yarn test:unit

# run integration tests
yarn test:integration

# run all tests and watch for changes
yarn test:watch

## 发布检测验证

```bash
# run lint and tests
yarn validate
```

## 运行日志

```bash
# show logs in production
pm2 logs
```

## 发布API doc文档

```bash
# generate and open api documentation
yarn docs
```    

## 发布

Set your server ip:

```bash
DEPLOY_SERVER=127.0.0.1
```

Replace my Docker username with yours:

```bash
nano deploy.sh
```

Run deploy script:

```bash
yarn deploy
or
sh ./deploy.sh
```
