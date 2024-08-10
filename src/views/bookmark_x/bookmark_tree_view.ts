import * as vscode from 'vscode';
import { ThemeColor, ThemeIcon, ViewBadge } from 'vscode';
import { Controller, SpaceMap } from './controller';
import { BookmarkTreeItem } from './bookmark_tree_item';
import { Bookmark, Group } from './functional_types';
import * as util from './util';
import { ICON_GROUP, ITEM_TYPE_GROUP, ITEM_TYPE_GROUP_LIKE } from './constants';
import { BmxTreeItem } from './bookmark_tree_data_provider';

class MyViewBadge implements ViewBadge {
    tooltip: string;
    value: number;
    public constructor(value: number = 0) {
        this.value = value;
        this.tooltip = `${this.value} bookmarks`;
    }
}

export class BookmarkTreeViewManager {

    static controller: Controller;

    static view: vscode.TreeView<BmxTreeItem>;

    static refreshCallback() {
        if (this.controller!.tprovider !== null) {
            this.controller!.tprovider.refresh();
        }
        this.refresh_badge();
    }

    static async init() {
        // this.treeDataProviderByFile = this.controller.getTreeDataProviderByFile();
        // vscode.TreeViewOptions
        if (!this.view) {
            let view = vscode.window.createTreeView<BmxTreeItem>('bookmarksByGroup', {
                treeDataProvider: this.controller.tprovider,
                dragAndDropController: this.controller.tprovider,
                showCollapseAll: true, canSelectMany: true
            });
            view.description = "manage your bookmarks";
            this.view = view;
        }
    }
    static refresh_badge() {
        let num = 0;
        SpaceMap.rgs.forEach(rg => {
            num += rg.cache.bookmark_num();
        })
        this.view.badge = new MyViewBadge(num);
    }

    static async activateGroup(treeItem: BookmarkTreeItem) {
        let wsf = util.getWsfWithActiveEditor();
        if (treeItem === undefined) {
            let cache = this.controller!.get_root_group(wsf!).cache;
            let selectedFile: string | undefined = await vscode.window.showQuickPick(
                (() => {
                    let options = ["root"];
                    for (const element of cache.keys().slice(1)) {
                        if (cache.get(element).type === "group") {
                            options.push(element)
                        }
                    }
                    return options;
                })(),
                { placeHolder: 'Select a file', canPickMany: false }
            );

            if (selectedFile === "root") { selectedFile = ""; }
            if (selectedFile === undefined) { return; }
            this.controller!.activateGroup(selectedFile, wsf!);
            this.controller!.get_root_group(wsf!).vicache.refresh_active_icon_status(selectedFile);
            return;
        }
    }

    static deleteGroup(treeItem: BookmarkTreeItem) {
        const group = treeItem.getBaseGroup();
        this.controller!.safeDeleteGroups(group!).then(res => {
            if (res) { vscode.window.showInformationMessage(`delete ${group!.get_full_uri()} successfully`); }
            else { vscode.window.showInformationMessage(`didn't delete`); }
        })

    }

    static deleteBookmark(treeItem: BookmarkTreeItem) {
        const bookmark = treeItem.getBaseBookmark();
        this.controller!.deleteBookmark(bookmark!);
    }

    static addSubGroup(treeItem: BookmarkTreeItem) {
        const group = treeItem.getBaseGroup()!;
        this.controller!.inputBoxGetName().then((name: String) => {
            let uri = util.joinTreeUri([group.get_full_uri(), name]);
            let wsf = this.controller!.get_wsf_with_node(group);
            this.controller!.addGroup(uri, wsf!);
        });
    }

    static editNodeLabel(treeItem: BookmarkTreeItem) {
        const node = treeItem.base;
        if (node) {
            this.controller!.inputBoxGetName(node.name).then((label) => {
                if (label === node.name) {
                    vscode.window.showInformationMessage("edit info: label unchanged");
                    return;
                } else if (!this.controller!.editNodeLabel(node, label)) {
                    vscode.window.showInformationMessage("edit fail: label exists!");
                    return;
                }
                this.controller!.updateDecorations();
            });
        } else {
            vscode.window.showInformationMessage("node is null");
        }
    }
}