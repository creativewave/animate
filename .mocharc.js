
process.env.NODE_ENV = 'test' // @babel/preset-env will use it when parsing its config file

module.exports = {
    require: ['@babel/register', 'mocha-clean'],
}
