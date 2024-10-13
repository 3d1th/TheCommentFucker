import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as jsonc from 'jsonc-parser';

/*

 This extension removes comments from the active editor.
 It supports both line comments and block comments.
 The comment style is determined by the language configuration file of the active editor.
 If the comment style is not found, a message is displayed to the user.
 The extension also handles comments inside string literals.

 The Comment Fucker INC.

 
*/

export function activate(context: vscode.ExtensionContext) {
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
				const fullRange = new vscode.Range(
					document.positionAt(0),
					document.positionAt(text.length)
				);
				editBuilder.replace(fullRange, updatedText);
			});
		}
	});

	context.subscriptions.push(disposable);
}


async function getLanguageConfigFile(langID: string) {
	let thisConfig: any = {};
	let langConfigFilePath: string | null = null;

	
	for (let ext of vscode.extensions.all) {
		if (ext.packageJSON.contributes && ext.packageJSON.contributes.languages) {
			for (let packageLang of ext.packageJSON.contributes.languages) {
				if (packageLang.id === langID && packageLang.configuration) {
					langConfigFilePath = path.join(
						ext.extensionPath,
						packageLang.configuration
					);

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


function removeComments(text: string, comments: { lineComment?: string, blockComment?: string[] }): string {
	let updatedText = text;
	const lineComment = comments.lineComment;
	const blockComment = comments.blockComment;

	
	const stringLiterals = getStringLiteralRanges(text);

	
	if (lineComment) {
		// 느낌표(!)로 시작하는 주석은 건너뛰기
		const lineCommentRegex = new RegExp(`${escapeRegExp(lineComment)}(?!\\s*!).*?$`, 'gm');
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


function getStringLiteralRanges(text: string): Array<[number, number]> {
	const regex = /(["'`])(\\?.)*?\1/g;
	const ranges: Array<[number, number]> = [];
	let match: RegExpExecArray | null;

	while ((match = regex.exec(text)) !== null) {
		ranges.push([match.index, match.index + match[0].length]);
	}

	return ranges;
}


function isInStringLiteral(position: number, stringLiterals: Array<[number, number]>): boolean {
	for (const [start, end] of stringLiterals) {
		if (position >= start && position <= end) {
			return true;
		}
	}
	return false;
}


function escapeRegExp(string: string): string {
	return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function deactivate() { }
