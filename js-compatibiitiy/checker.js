#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { program } = require('commander');
const chalk = require("chalk");
const myprocess = require('./myprocess');
const iconv = require('iconv-lite');

const commonCmdOptions = { encoding: "utf8", stdio: "inherit" };
const CMD_NPM = process.platform === "win32" ? "npm.cmd" : "npm";
const CMD_ESLINT = process.platform === "win32" ? `${__dirname}.\\node_modules\\.bin\\eslint.cmd` : `${__dirname}.\\node_modules\\.bin\\eslint`;
const CWD = process.cwd();

/*
 * 使用“npm i --no-save pkgName”下载npm包
 */
async function downloadPackage(downloadDir, pkgName, forceClean) {
    let dirNodeModules = `${downloadDir}/node_modules`;
    if (!!forceClean && fs.existsSync(dirNodeModules)) {
        fs.rmSync(dirNodeModules, { recursive: true });
    }

    let exitCode = await myprocess.spawn(CMD_NPM,
        ["i", "--no-save", pkgName],
        { ...commonCmdOptions, ...{ cwd: downloadDir } });

    if (exitCode === 0) {
        let subItems = fs.readdirSync(dirNodeModules);
        subItems.forEach(pkgItem => {
            let lintrcFiles = ['.eslintignore', '.eslintrc', '.eslintrc.js', '.eslintrc.yml', '.eslintrc.json'];
            lintrcFiles.forEach(lintFile => {
                if (fs.existsSync(`${dirNodeModules}/${pkgItem}/${lintFile}`)) {
                    fs.unlinkSync(`${dirNodeModules}/${pkgItem}/${lintFile}`)
                }

                ['amd', 'cjs', 'modules'].forEach(subDir => {
                    if (fs.existsSync(`${dirNodeModules}/${pkgItem}/${subDir}/${lintFile}`)) {
                        fs.unlinkSync(`${dirNodeModules}/${pkgItem}/${subDir}/${lintFile}`)
                    }
                });
            });

            const pkgJsonFile = `${dirNodeModules}/${pkgItem}/package.json`;
            if (fs.existsSync(pkgJsonFile)) {
                const packageJson = require(pkgJsonFile);
                if (packageJson.eslintConfig) {
                    delete packageJson.eslintConfig;
                    fs.writeFileSync(
                        pkgJsonFile,
                        iconv.encode(JSON.stringify(packageJson), 'utf8')
                    );
                }
            }
        });

        return true;
    } else {
        console.log(`download process exited. exit code: ${exitCode}`);
        return false;
    }
}

(async function main() {
    program
        .description(`检查JS代码对NodeJS和Web浏览器的内置模块、对象的依赖及兼容ES标准版本。支持检查按源码目录或三方库名称检查。`)
        .option("-d, --dir <dir>", "指定要检查的目录")
        .option("-p, --package <package>", "指定要检查的npm包名")
        .option("-o, --output <path>", "指定报告的输出路径")
        .option("-f, --formatter <formatter>", "指定报告格式")
        .option("--clean", "清除已下载的包，按包名检查时建议加上此参数");

    program.parse(process.argv);
    let options = program.opts();

    let checkPath;
    if (!!options.package) {
        checkPath = `${__dirname}/temp`;
        let result = await downloadPackage(checkPath, options.package, options.clean);
        if (result) {
            console.log(chalk.green(`完成'${options.package}'包下载.`));
        } else {
            console.log(chalk.red(`下载'${options.package}'包失败，退出检查.`));
            return;
        }
    } else if (!!options.dir) {
        checkPath = path.resolve(CWD, options.dir);
    } else {
        console.log('请指定检查路径或包名');
        return;
    }

    let checkOptions = ["--cache", "-c", `${__dirname}/conf/.eslintrc.yml`, "--ext", ".js,.ts"];
    checkOptions.push(
        "--ignore-pattern", `!node_modules/*`,
        "--ignore-pattern", `**/*.d.ts`,
        "--ignore-pattern", `**/*.jest.js`
    );

    if (!!options.formatter) {
        checkOptions.push("-f", options.formatter);
    }

    let outputFile;
    if (!!options.output) {
        outputFile = path.resolve(CWD, options.output);
        checkOptions.push("-o", outputFile);
    } else {
        if (!!options.formatter && options.formatter.indexOf('csv') >= 0) {
            if (!!options.package) {
                const reportDir = `${__dirname}/reports`;
                if (!fs.existsSync(reportDir)) {
                    fs.mkdirSync(reportDir);
                }
                outputFile = `${reportDir}/${options.package}.csv`;
            } else {
                outputFile = `${__dirname}/report.csv`;
            }

            checkOptions.push("-o", outputFile);
        }
    }

    checkOptions.push(`${checkPath}`);
    let exitCode = await myprocess.spawn(CMD_ESLINT, checkOptions, { ...commonCmdOptions, ...{ cwd: checkPath } });
    switch (exitCode) {
        case 0:
            console.log(chalk.green(`\n通过检测，无问题。`));
            break;
        case 1:
            console.log(chalk.bold(chalk.green('\n检测完成')) + '，' + chalk.red(`存在兼容问题，具体文件见检查报告。`));
            if (!!outputFile) {
                console.log(`检查报告文件：${path.normalize(outputFile)}`);
            }
            break;
        case 2:
            console.log(chalk.red(`\n检测失败，可能原因：错误的lint配置或其他内部错误，请查看上面输出的日志处理，重新检测。`));
            break;
        default:
            console.log(chalk.red(`\n检测失败，请查看上面输出的日志处理，重新检测。`));
            break;
    }

    // Resets output color, for prevent change on top level
    chalk.reset();
    process.exitCode = exitCode;
}()).catch((error) => {
    console.error(`error: ${error}`);
    process.exitCode = -1;
})
