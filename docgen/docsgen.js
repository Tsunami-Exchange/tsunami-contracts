const fs = require("fs");

const contracts = ["vAMM3", "orders2"];

const exportFile = (file) => {
  let str = fs.readFileSync(`./contracts/ride/${file}.ride`).toString();

  const findRawCallableFns = (str) => {
    const re = /\@Callable\(i\).*?{/gs;
    let result = str.match(re);
    return result;
  };

  const extractComment = (allStr, name) => {
    let lineByLine = allStr.split("\n");
    let lineWithName = lineByLine.find((x) => x.includes(`func ${name}(`));
    let lineIndex = lineByLine.indexOf(lineWithName);
    let commentLineIndex = lineIndex - 2;
    let comments = [];
    while (commentLineIndex != -1) {
      let commentLine = lineByLine[commentLineIndex].trim();
      if (commentLine.startsWith("#")) {
        comments.push(commentLine);
        commentLineIndex--;
      } else {
        commentLineIndex = -1;
      }
    }

    comments.reverse();
    return comments.join("\n");
  };

  function objectMap(object, mapFn) {
    return Object.keys(object).reduce(function (result, key) {
      result[key] = mapFn(object[key]);
      return result;
    }, {});
  }

  const parseComment = (comment) => {
    let commentLineByLine = comment
      .split("\n")
      .map((x) => x.trim().replace("# ", "").replace("#", ""));
    let c = { str: "" };
    let parsed = {
      description: c,
      notices: [],
      payments: [],
      params: {},
    };

    for (let line of commentLineByLine) {
      if (line.startsWith("@notice")) {
        c = { str: "" };
        parsed.notices.push(c);
        line = line.replace("@notice ", "");
      }
      if (line.startsWith("@payment")) {
        c = { str: "" };
        parsed.payments.push(c);
        line = line.replace("@payment ", "");
      }
      if (line.startsWith("@param")) {
        c = { str: "" };
        let byWord = line.split(" ");
        let ix = byWord.indexOf("@param");
        let name = byWord[ix + 1];
        parsed.params[byWord[ix + 1]] = c;
        line = line.replace(`@param ${name} `, "");
      }

      c.str = c.str + line;
    }

    const clean = (x) => x.str;

    let result = {
      description: clean(parsed.description),
      notices: parsed.notices.map(clean),
      payments: parsed.payments.map(clean),
      params: objectMap(parsed.params, clean),
    };

    return result;
  };

  const rawCallableToFuncDef = (allStr, str) => {
    const p = /func .*\(/s;
    let names = str.match(p);
    let name = names[0].replace("func ", "").replace("(", "");

    const p2 = /\(.*\)/s;
    let allParamsStr = str.replace("@Callable(i)", "").match(p2);
    let allParamsStrArr = allParamsStr[0]
      .replace("(", "")
      .replace(")", "")
      .split(",")
      .map((x) => x.trim());
    let params = [];
    if (allParamsStrArr[0] != "") {
      params = allParamsStrArr.map((p) => {
        let [name, type] = p.split(":");
        return {
          name: name && name.trim(),
          type: type && type.trim(),
        };
      });
    }
    let comment = extractComment(allStr, name);
    let cp = parseComment(comment);

    return {
      name,
      params,
      comment,
      body: str,
      cp,
    };
  };

  const tagFunc = (func) => {
    let tags = [];
    if (func.name.includes("view_")) {
      tags.push("view");
    }
    if (func.body.includes("i.caller == admin")) {
      tags.push("admin_only");
    }
    if (func.body.includes("i.caller != this")) {
      tags.push("self_only");
    }
    return {
      ...func,
      tags,
    };
  };

  const toMarkdown = (defs) => {
    let result = "# vAMM3.ride\n";
    result += "\n";
    result += "## Functions";
    result += "\n";
    for (let def of defs) {
      result += `### ${def.name}`;
      result += `\n`;
      result += `\`${def.name}\` - ${def.cp.description}`;
      result += `\n`;

      if (def.cp.notices.length > 0) {
        result += `\n`;
        for (let note of def.cp.notices) {
          result += `**note:** ${note}`;
          result += `\n`;
        }
        result += `\n`;
      }
      if (def.params.length > 0) {
        result += `\n`;
        result += `#### Parameters`;
        result += `\n`;
        for (let param of def.params) {
          let doc = def.cp.params[param.name];
          result += `\`${param.name}\`: \`${param.type}\``;
          if (doc) {
            result += `- ${doc}`;
          }
          result += `\n`;
        }

        result += `\n`;
      }

      if (def.cp.payments.length > 0) {
        result += `\n`;
        result += `#### Payments`;
        result += `\n`;
        let pi = 1;
        for (let payment of def.cp.payments) {
          let doc = payment;
          result += `\`Payment ${pi++}\`: ${doc}`;
          result += `\n`;
        }

        result += `\n`;
      }
    }

    return result;
  };

  const raw = findRawCallableFns(str);
  const defs = raw.map((x) => rawCallableToFuncDef(str, x)).map(tagFunc);

  console.log(JSON.stringify(defs, null, 2));

  fs.writeFileSync(`./docgen/results/${file}.md`, toMarkdown(defs));
};

contracts.forEach(exportFile);
