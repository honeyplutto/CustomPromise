class CustomPromise {

    constructor(executor) {
        this._resolutionQueue = [];
        this._rejectionQueue = [];
        this._state = 'pending';
        this._value;
        this._rejectionReason;

        try {
            executor(this._resolve.bind(this), this._reject.bind(this));
        } catch (e) {
            this._reject(e);
        }
    }

    _runRejectionHandlers() {

        while(this._rejectionQueue.length > 0) {
            const rejection = this._rejectionQueue.shift();

            try {
                var returnValue = rejection.handler(this._rejectionReason);
            } catch(e) {
                rejection.promise._reject(e);
            }

            if (returnValue && returnValue instanceof CustomPromise) {
                returnValue.then(function (v) {
                    rejection.promise._resolve(v);
                }).catch(function (e) {
                    rejection.promise._reject(e);
                });
            } else {
                rejection.promise._resolve(returnValue);
            }
        }
    }

    _runResolutionHandlers() {
        while(this._resolutionQueue.length > 0) {
            const resolution = this._resolutionQueue.shift();

            try {
                var returnValue = resolution.handler(this._value);
            } catch(e) {
                resolution.promise._reject(e);
            }

            if (returnValue && returnValue instanceof CustomPromise) {
                returnValue.then(function (v) {
                    resolution.promise._resolve(v);
                }).catch(function (e) {
                    resolution.promise._reject(e);
                });
            } else {
                resolution.promise._resolve(returnValue);
            }
        }
    }

    _reject(reason) {
        if (this._state === 'pending') {
            this._rejectionReason = reason;
            this._state = 'rejected';

            this._runRejectionHandlers();

            while(this._resolutionQueue.length > 0) {
                const resolution = this._resolutionQueue.shift();
                resolution.promise._reject(this._rejectionReason);
            }
        }
    }

    _resolve(value) {
        if (this._state === 'pending') {
            this._value = value;
            this._state = 'resolved';

            this._runResolutionHandlers();
        }
    }

    then(resolutionHandler, rejectionHandler) {
        const newPromise = new CustomPromise(function () {});

        this._resolutionQueue.push({
            handler: resolutionHandler,
            promise: newPromise
        });

        if (typeof rejectionHandler === 'function') {
            this._rejectionQueue.push({
                handler: rejectionHandler,
                promise: newPromise
            });
        }

        if (this._state === 'resolved') {
            this._runResolutionHandlers();
        }

        if (this._state === 'rejected') {
            newPromise._reject(this._rejectionReason);
        }

        return newPromise;
    }

    catch(rejectionHandler) {
        const newPromise = new CustomPromise(function () {});

        this._rejectionQueue.push({
            handler: rejectionHandler,
            promise: newPromise
        });

        if (this._state === 'rejected') {
            this._runRejectionHandlers();
        }

        return newPromise;
    }

}


const ajax = (method, url) => {
    return new CustomPromise(function (resolve, reject) {
      const xhr = new XMLHttpRequest();
      xhr.open(method, url);
      xhr.onload = function () {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(xhr.response);
        } else {
          reject({
            status: xhr.status,
            statusText: xhr.statusText
          });
        }
      };
      xhr.onerror = function () {
        reject({
          status: xhr.status,
          statusText: xhr.statusText
        });
      };
      xhr.send();
    });
}

ajax('GET', 'https://jsonplaceholder.typicode.com/users').then();