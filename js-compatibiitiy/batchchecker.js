const myprocess = require('./myprocess');
const fs = require('fs');
const path = require('path');
const iconv = require('iconv-lite');

const output_file_encoding = 'gbk';
const summary_file = path.join(__dirname, `summary.csv`);

function exitCode2String(exitCode) {
    switch (exitCode) {
        case 0:
            return '检测通过';
        case 1:
            return '检测不通过';
        case 2:
        default:
            return '检测执行异常';
    }
}

// 获取行数
function summarizeReport(reportFileFullname) {
    if (fs.existsSync(reportFileFullname)) {
        let fileContent = fs.readFileSync(reportFileFullname, { encoding: 'utf8' });
        const reportList = fileContent.split('\n').slice(1).slice(0, -1);
        const ruleIdIdx = 4;
        const errorMsgIdx = 5;
        let ruleIds = [];
        let noUndefNames = [];
        let noRestrictedModulesNames = [];
        let noUndefCount = 0;
        let noRestrictedModulesCount = 0;
        for (let i = 0; i < reportList.length; i++) {
            let reportDetails = reportList[i].split(',');
            let ruleId = reportDetails[ruleIdIdx];
            let errorMsg = reportDetails[errorMsgIdx];
            switch (ruleId) {
                case 'no-undef':
                    noUndefCount++;
                    let noUndefName = errorMsg.split(' ')[0].replaceAll("'", "").replaceAll('"', '');
                    if(noUndefName && !noUndefNames.includes(noUndefName)){
                        noUndefNames.push(noUndefName);
                    }
                    break;
                case 'no-restricted-modules':
                    noRestrictedModulesCount++;
                    let noRestrictedModulesName = errorMsg.split(' ')[0].replaceAll("'", "").replaceAll('"', '');
                    if(noRestrictedModulesName && !noRestrictedModulesNames.includes(noRestrictedModulesName)){
                        noRestrictedModulesNames.push(noRestrictedModulesName);
                    }
                    break;
                default:
                    break;
            }

            if (!ruleIds.includes(ruleId)) {
                ruleIds.push(ruleId);
            }
        }

        return {
            errorCount: reportList.length,
            noUndefCount,
            noUndefNames: noUndefNames.sort(),
            noRestrictedModulesCount,
            noRestrictedModulesNames: noRestrictedModulesNames.sort(),
            ruleIds
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
        iconv.encode(`包名,检测结果,错误数,错误RuleIds,no-undef数,no-undef对象,no-restrict-modules数,no-restrict-modules模块\r\n`, output_file_encoding)
    );

    let strPkgList = fs.readFileSync(path.join(__dirname, 'pkglist.txt'), { encoding: 'utf8' });
    let pkgList = strPkgList.replaceAll('\r', '').split('\n');
    let pkgIdx = 0;
    async function doCheck(pkgName) {
        let exitCode = await myprocess.spawn('node', ["checker.js", "--clean", "-p", pkgName, "-f", "csv"], { ...myprocess.commonCmdOptions, ...{ cwd: __dirname } });
        return exitCode;
    }

    for (; pkgIdx < pkgList.length; pkgIdx++) {
        let exitCode = await doCheck(pkgList[pkgIdx]);
        const reportFile = `${__dirname}/reports/${pkgList[pkgIdx]}.csv`;
        const reportSummary = summarizeReport(reportFile);
        fs.appendFileSync(summary_file,
            iconv.encode(`${pkgList[pkgIdx]},`
                + `${exitCode2String(exitCode)},`
                + `${reportSummary ? reportSummary.errorCount : ''},`
                + `${reportSummary ? '"' + reportSummary.ruleIds.join("\r\n") + '"' : ''},`
                + `${reportSummary ? reportSummary.noUndefCount : ''},`
                + `${reportSummary ? '"' + reportSummary.noUndefNames.join("\r\n") + '"' : ''},`
                + `${reportSummary ? reportSummary.noRestrictedModulesCount : ''},`
                + `${reportSummary ? '"' + reportSummary.noRestrictedModulesNames.join("\r\n") + '"' : ''},`
                + '\r\n', output_file_encoding));
    }
})();
