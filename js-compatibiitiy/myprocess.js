const child_process = require('child_process');

/*
 * 将child_process.spawn封装成Promise方式调用。
 */
function spawn(command, args, options) {
    return new Promise(function (resolve, reject) {
        let childProcess = child_process.spawn(command, args, options);
        childProcess.on('close', (code) => {
            resolve(code);
        });
    })
};

exports.spawn = spawn;
exports.commonCmdOptions = { encoding: "utf8", stdio: "inherit" };