"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const jsonc = __importStar(require("jsonc-parser"));
/*

 This extension removes comments from the active editor.
 It supports both line comments and block comments.
 The comment style is determined by the language configuration file of the active editor.
 If the comment style is not found, a message is displayed to the user.
 The extension also handles comments inside string literals.

 The Comment Fucker INC.

 
*/
function activate(context) {
    let disposable = vscode.commands.registerCommand('commentRemover.removeComments', async function () {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const document = editor.document;
            const text = document.getText();
            const languageId = document.languageId;
            const config = await getLanguageConfigFile(languageId);
            if (!config || !config.comments || (!config.comments.lineComment && !config.comments.blockComment)) {
                vscode.window.showInformationMessage('No comment style found for this language.');
                return;
            }
            const updatedText = removeComments(text, config.comments);
            editor.edit(editBuilder => {
                const fullRange = new vscode.Range(document.positionAt(0), document.positionAt(text.length));
                editBuilder.replace(fullRange, updatedText);
            });
        }
    });
    context.subscriptions.push(disposable);
}
async function getLanguageConfigFile(langID) {
    let thisConfig = {};
    let langConfigFilePath = null;
    for (let ext of vscode.extensions.all) {
        if (ext.packageJSON.contributes && ext.packageJSON.contributes.languages) {
            for (let packageLang of ext.packageJSON.contributes.languages) {
                if (packageLang.id === langID && packageLang.configuration) {
                    langConfigFilePath = path.join(ext.extensionPath, packageLang.configuration);
                    if (fs.existsSync(langConfigFilePath)) {
                        thisConfig = jsonc.parse(fs.readFileSync(langConfigFilePath).toString());
                        return thisConfig;
                    }
                }
            }
        }
    }
    return thisConfig;
}
function removeComments(text, comments) {
    let updatedText = text;
    const lineComment = comments.lineComment;
    const blockComment = comments.blockComment;
    const stringLiterals = getStringLiteralRanges(text);
    if (lineComment) {
        const lineCommentRegex = new RegExp(`${escapeRegExp(lineComment)}.*$`, 'gm');
        updatedText = updatedText.replace(lineCommentRegex, (match, offset) => {
            return isInStringLiteral(offset, stringLiterals) ? match : '';
        });
    }
    if (blockComment) {
        const blockCommentRegex = new RegExp(`${escapeRegExp(blockComment[0])}[\\s\\S]*?${escapeRegExp(blockComment[1])}`, 'gm');
        updatedText = updatedText.replace(blockCommentRegex, (match, offset) => {
            return isInStringLiteral(offset, stringLiterals) ? match : '';
        });
    }
    return updatedText;
}
function getStringLiteralRanges(text) {
    const regex = /(["'`])(\\?.)*?\1/g;
    const ranges = [];
    let match;
    while ((match = regex.exec(text)) !== null) {
        ranges.push([match.index, match.index + match[0].length]);
    }
    return ranges;
}
function isInStringLiteral(position, stringLiterals) {
    for (const [start, end] of stringLiterals) {
        if (position >= start && position <= end) {
            return true;
        }
    }
    return false;
}
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
function deactivate() { }
//# sourceMappingURL=extension.js.map