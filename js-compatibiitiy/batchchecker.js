const myprocess = require('./myprocess');
const fs = require('fs');
const path = require('path');
const iconv = require('iconv-lite');

const output_file_encoding = 'gbk';
const summary_file = path.join(__dirname, `summary.csv`);

(async function main() {
    try {
        fs.unlinkSync(summary_file);
    } catch (err) { }

    fs.appendFileSync(
        summary_file,
        iconv.encode(`包名,检测结果code\r\n`, output_file_encoding)
    );

    let strPkgList = fs.readFileSync(path.join(__dirname, 'pkglist.txt'), { encoding: 'utf8' });
    let pkgList = strPkgList.split('\r\n');
    let pkgIdx = 0;
    async function doCheck(pkgName) {
        let exitCode = await myprocess.spawn('node', ["checker.js", "--clean", "-p", pkgName, "-f", "csv"], { ...myprocess.commonCmdOptions, ...{ cwd: __dirname } });
        return exitCode;
    }

    for (; pkgIdx < pkgList.length; pkgIdx++) {
        let exitCode = await doCheck(pkgList[pkgIdx]);
        fs.appendFileSync(summary_file, `${pkgList[pkgIdx]},${exitCode}\r\n`);
    }
})();
