function relation() {
    var args = [...arguments];

    var listLength = document.querySelector('#relation_entity_input > div').childNodes.length;

    // 超过两个，点击添加按钮
    if (args.length > listLength) {
        for (let i = 0; i < args.length - listLength; i++) {
            document.querySelector('#JRelationLeftContainer > div > div > div > button').click();
        }
    }
    function loop(i, cb) {
        if (i >= args.length) {
            cb();
            return;
        }

        console.log(i);

        let input = document.querySelector(
            `#relation_entity_input > div > div:nth-child(${i + 1}) > div > div > div > div > input`
        );

        input.click();
        input.focus();

        setTimeout(() => {
            input.value = args[i];

            let event = new Event('Change', {
                bubbles: true,
            });

            input.dispatchEvent(event);

            // setTimeout(() => {
            //     document
            //         .querySelector(
            //             `body > div:nth-child(${i + 5}) > div > div > div > div > div > div > div > div:nth-child(1)`
            //         )
            //         .click();

            //     loop(i + 1, cb);
            // }, 2000);
        }, 1000);
    }

    loop(0, () => {
        // document.querySelector('#JRelationLeftContainer > div > div > button').click();
    });
}

setTimeout(() => {
    relation('河北中惠博裕科技有限公司', '河北腾翔科技有限公司', '瑞和安惠项目管理集团有限公司');
}, 3000);

var nodes = path
    .map((item) => item.path.filter((i) => i.type === 'NODE'))
    .reduce((prev, cur) => {
        return [...prev, ...cur];
    }, [])
    .reduce((prev, cur) => {
        if (prev.every((i) => i.companyId !== cur.companyId)) {
            prev.push(cur);
        }

        if (prev.every((i) => i.humanPid !== cur.humanPid)) {
            prev.push(cur);
        }

        return prev;
    }, [])
    .map((item) => {
        return {
            id: item.humanPid || item.companyId,
            text: item.entityName,
        };
    });

var paths = path
    .map((item) => item.path.filter((i) => i.type === 'RELATION'))
    .reduce((prev, cur) => {
        return [...prev, ...cur];
    }, [])
    .reduce((prev, cur) => {
        if (prev.every((i) => !(
            i.sourceId === cur.sourceId
            && i.targetId === cur.targetId
        ))) {
            prev.push(cur);
        }

        return prev;
    }, [])
    .map((item) => {
        return {
            from: item.sourceId,
            to: item.targetId,
        };
    });
