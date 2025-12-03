const fs = require('fs');

try {
    const buffer = fs.readFileSync('smoke_test_report_2.json');
    let content;
    if (buffer[0] === 0xFF && buffer[1] === 0xFE) {
        content = buffer.toString('utf16le');
    } else {
        content = buffer.toString('utf8');
    }
    content = content.replace(/^\uFEFF/, '');
    const lastBrace = content.lastIndexOf('}');
    if (lastBrace !== -1) content = content.substring(0, lastBrace + 1);

    const report = JSON.parse(content);

    console.log('Root keys:', Object.keys(report));
    if (report.suites && report.suites.length > 0) {
        console.log('Suite 0 keys:', Object.keys(report.suites[0]));
        if (report.suites[0].specs && report.suites[0].specs.length > 0) {
            console.log('Spec 0 keys:', Object.keys(report.suites[0].specs[0]));
            if (report.suites[0].specs[0].tests && report.suites[0].specs[0].tests.length > 0) {
                console.log('Test 0 keys:', Object.keys(report.suites[0].specs[0].tests[0]));
                console.log('Test 0 status:', report.suites[0].specs[0].tests[0].status);
                console.log('Test 0 results:', report.suites[0].specs[0].tests[0].results);
            }
        }
    }

} catch (err) {
    console.error(err);
}
