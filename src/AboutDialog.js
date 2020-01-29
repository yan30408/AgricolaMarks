import React from "react";
import { withStyles } from "@material-ui/core/styles";
import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Dialog,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Slide
} from "@material-ui/core";

import CloseIcon from "@material-ui/icons/Close";

const styles = theme => ({
  appBar: {
    position: "relative"
  },
  flex: {
    flex: 1
  },
  historyList: {
    paddingLeft: theme.spacing.unit * 3
  }
});

function Transition(props) {
  return <Slide direction="down" {...props} />;
}

function ShowHistory(props) {
  return (
    <div>
      <Typography
        variant="subtitle2"
        color="inherit"
        className={props.classes.flex}
      >
        Version {props.version} - ({props.date})
      </Typography>
      <Typography
        variant="caption"
        color="inherit"
        className={props.classes.flex}
      >
        <ul className={props.classes.historyList}>
          {props.changes.map(value => (
            <li>{value}</li>
          ))}
        </ul>
      </Typography>
    </div>
  );
}

class AboutDialog extends React.Component {
  render() {
    const { classes } = this.props;
    const version = process.env.REACT_APP_VERSION;

    return (
      <div>
        <Dialog
          open={this.props.isOpen}
          onClose={this.props.onClose}
          TransitionComponent={Transition}
        >
          <AppBar className={classes.appBar}>
            <Toolbar>
              <IconButton
                color="inherit"
                onClick={this.props.onClose}
                aria-label="Close"
              >
                <CloseIcon />
              </IconButton>
              <Typography variant="h6" color="inherit" className={classes.flex}>
                About
              </Typography>
            </Toolbar>
          </AppBar>
          <DialogTitle id="alert-dialog-title">Agricola Marks</DialogTitle>
          <DialogContent style={{ height: 500 }}>
            <DialogContentText>
              Version {version}
              <Typography variant="h6" color="inherit" className={classes.flex}>
                Author
              </Typography>
              <a href="https://twitter.com/yan3?lang=ja">@yan3</a> (
              <a href="http://spielembryo.geo.jp/">SpielEmbryo</a>)
              <Typography variant="h6" color="inherit" className={classes.flex}>
                History
              </Typography>
              <ShowHistory
                classes={classes}
                version={"1.5.1"}
                date={"2020.1.29"}
                changes={[
                  "favicon や title を適切なものに変更",
                  "MIT license のリンクを適切なものに変更"
                ]}
              />
              <ShowHistory
                classes={classes}
                version={"1.5"}
                date={"2019.1.12"}
                changes={[
                  "アイコンをオリジナルのものに差し替え",
                  "部屋種類の選択ボタンの配置を変更",
                  "部屋種類を選択時にアイコン表示も変わるように変更",
                  "リザルトの表示レイアウトを調整"
                ]}
              />
              <ShowHistory
                classes={classes}
                version={"1.4"}
                date={"2018.12.29"}
                changes={[
                  "リザルト画面の得点表示サイズを少し大きく変更",
                  "リザルト画面に付加情報として盤面点と盤外点の表示を追加",
                  "手番プレイヤー登録時に既に設定済みのプレイヤーは表示されないように変更"
                ]}
              />
              <ShowHistory
                classes={classes}
                version={"1.3"}
                date={"2018.12.13"}
                changes={[
                  "ボーナスの初期表示位置が左端にくるように修正",
                  "入力対象プレイヤーを切り替えた際にページ最上部までスクロールする処理を追加",
                  "NewGame と AllClear の際にページ最上部までスクロールする処理を追加"
                ]}
              />
              <ShowHistory
                classes={classes}
                version={"1.2"}
                date={"2018.12.6"}
                changes={[
                  "最近遊んだプレイヤーの名前入力簡略化を追加",
                  "プレイヤー色設定の項目を削除",
                  "得点項目のアイコン表示対応（仮）",
                  "得点項目のスライドアイコンを削除して表示を整理",
                  "物乞いは使用頻度が低いので一番下に移動",
                  "Result にプレイ日時を表示"
                ]}
              />
              <ShowHistory
                classes={classes}
                version={"1.1"}
                date={"2018.11.27"}
                changes={[
                  "localStrage に対応（更新時にステートを保持）",
                  "一部の誤字を修正"
                ]}
              />
              <ShowHistory
                classes={classes}
                version={"1.0"}
                date={"2018.11.24"}
                changes={["リリース開始"]}
              />
              <Typography variant="h6" color="inherit" className={classes.flex}>
                License
              </Typography>
              Copyright (c) 2018 yan3 Released under the{" "}
              <a href="https://opensource.org/licenses/mit-license.php">
                MIT license
              </a>
            </DialogContentText>
          </DialogContent>
        </Dialog>
      </div>
    );
  }
}

export default withStyles(styles)(AboutDialog);
