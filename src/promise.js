
const { errors } = require('./error.js')

function handleError(error) {
    if (error !== errors.ABORT) {
        throw error
    }
}

/**
 * then :: (ResolvedPromiseCallback -> RejectedPromiseCallback) -> Promise
 *
 * ResolvedPromiseCallback :: a -> x
 * RejectedPromiseCallback :: Error -> x
 */
function then(result, error) {
    return Promise.prototype.then.call(this, result, error).catch(handleError)
}

/**
 * create :: void -> Promise
 */
function create() {
    let resolvers
    const promise = new Promise((resolve, reject) => {
        resolvers = {
            reject(error) {
                if (status === 'pending') {
                    status = 'rejected'
                    reject(error)
                }
            },
            resolve(result) {
                if (status === 'pending') {
                    status = 'resolved'
                    resolve(result)
                }
            },
            then,
        }
    })
    let status = 'pending'
    Object.defineProperty(promise, 'status', {
        get() {
            return status
        },
    })
    promise.catch(handleError)
    return Object.assign(promise, resolvers)
}

module.exports = create
