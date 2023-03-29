const myprocess = require('./myprocess');
const fs = require('fs');
const path = require('path');
const iconv = require('iconv-lite');

const output_file_encoding = 'gbk';
const summary_file = path.join(__dirname, `summary.csv`);


class ErrorCounter {
    _name;
    _count;
    constructor(name, count) {
        this._name = name;
        this._count = count;
    }

    get name() {
        return this._name;
    }

    get count() {
        return this._count;
    }

    set count(newValue) {
        this._count = newValue;
    }

    toString() {
        return `${this._name} (${this._count})`;
    }
}

function exitCode2String(exitCode) {
    switch (exitCode) {
        case 0:
            return '通过';
        case 1:
            return '不通过';
        case 2:
        default:
            return '执行异常';
    }
}

function increaseErrCount(errCounterArr, name) {
    if (name) {
        let missingObj = errCounterArr.find(element => element.name == name);
        if (missingObj) {
            missingObj.count++;
        } else {
            errCounterArr.push(new ErrorCounter(name, 1));
        }
    }
}

function increaseErrCountByMsg(errCounterArr, errMsg) {
    let name = errMsg.split(' ')[0].replaceAll("'", "").replaceAll('"', '');
    name = name ?? '其他'
    increaseErrCount(errCounterArr, name);
}

function increaseErrCountByNoGlobalVarMsg(errCounterArr, errMsg) {
    let name = errMsg.split("'")[1].replaceAll("'", "").replaceAll('"', '');
    name = name ?? '其他'
    increaseErrCount(errCounterArr, name);
}

// 分析检查报告
function summarizeReport(reportFileFullname) {
    if (fs.existsSync(reportFileFullname)) {
        let fileContent = fs.readFileSync(reportFileFullname, { encoding: 'utf8' });
        const reportList = fileContent.split('\n').slice(1, -1);
        const ruleIdIdx = 4;
        const errMsgIdx = 5;

        let noUndefCount = 0;
        let noUndefNames = [];
        let noRestrictedModuleCount = 0;
        let noRestrictedModules = [];
        let noRestrictedGlobalCount = 0;
        let noRestrictedGlobals = [];
        let otherRuleCount = 0;
        let otherRules = [];
        for (let i = 0; i < reportList.length; i++) {
            let reportDetails = reportList[i].split(',');
            let ruleId = reportDetails[ruleIdIdx];
            let errMsg = reportDetails[errMsgIdx];
            switch (ruleId) {
                case 'no-undef':
                    noUndefCount++;
                    increaseErrCountByMsg(noUndefNames, errMsg);
                    break;
                case 'no-restricted-modules':
                    noRestrictedModuleCount++;
                    increaseErrCountByMsg(noRestrictedModules, errMsg);
                    break;
                case 'no-restricted-globals':
                    noRestrictedGlobalCount++;
                    increaseErrCountByNoGlobalVarMsg(noRestrictedGlobals, errMsg);
                    break;
                default:
                    otherRuleCount++;
                    increaseErrCount(otherRules, ruleId);
                    break;
            }
        }

        return {
            'errorCount': reportList.length,
            noUndefCount,
            'noUndefNames': noUndefNames.sort(),
            noRestrictedModuleCount,
            'noRestrictedModules': noRestrictedModules.sort(),
            noRestrictedGlobalCount,
            'noRestrictedGlobals': noRestrictedGlobals.sort(),
            otherRuleCount,
            'otherRules': otherRules.sort()
        }
    } else {
        return undefined;
    }
}


(async function main() {
    try {
        fs.unlinkSync(summary_file);
    } catch (err) { }

    fs.appendFileSync(
        summary_file,
        iconv.encode('包名,检测结果,错误总数'
            + ',未声明的变量,错误数'
            + ',禁用的模块,错误数'
            + ',禁用的全局变量,错误数'
            + ',其他错误,错误数'
            + ',报告地址'
            + '\r\n', output_file_encoding)
    );

    let strPkgList = fs.readFileSync(path.join(__dirname, 'pkglist.txt'), { encoding: 'utf8' });
    let pkgList = strPkgList.replaceAll('\r', '').split('\n');
    let pkgIdx = 0;
    async function doCheck(pkgName) {
        let exitCode = await myprocess.spawn('node', ["checker.js", "--clean", "-p", pkgName, "-f", "csv"], { ...myprocess.commonCmdOptions, ...{ cwd: __dirname } });
        return exitCode;
    }

    for (; pkgIdx < pkgList.length; pkgIdx++) {
        if(!!!pkgList[pkgIdx]){
            continue;
        }

        let exitCode = await doCheck(pkgList[pkgIdx]);
        const reportFile = `${__dirname}/reports/${pkgList[pkgIdx]}.csv`;
        const reportSummary = summarizeReport(reportFile);
        if(exitCode === 1 && reportSummary.errorCount ===0) {
            exitCode = 0;
        }

        fs.appendFileSync(summary_file,
            iconv.encode(`${pkgList[pkgIdx]},`
                + `${exitCode2String(exitCode)},`
                + `${reportSummary ? reportSummary.errorCount : ''},`
                + `${reportSummary ? '"' + reportSummary.noUndefNames.join("\r\n") + '"' : ''},`
                + `${reportSummary ? reportSummary.noUndefCount : ''},`
                + `${reportSummary ? '"' + reportSummary.noRestrictedModules.join("\r\n") + '"' : ''},`
                + `${reportSummary ? reportSummary.noRestrictedModuleCount : ''},`
                + `${reportSummary ? '"' + reportSummary.noRestrictedGlobals.join("\r\n") + '"' : ''},`
                + `${reportSummary ? reportSummary.noRestrictedGlobalCount : ''},`
                + `${reportSummary ? '"' + reportSummary.otherRules.join("\r\n") + '"' : ''},`
                + `${reportSummary ? reportSummary.otherRuleCount : ''},`
                + `${reportFile},`
                + '\r\n', output_file_encoding));
    }
})();
