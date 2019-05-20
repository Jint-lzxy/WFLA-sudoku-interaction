//index.js
// slice只能拷贝一层
// import objDeepCopy from '../../utils/objDeepCopy.js'
// import { degree } from '../../utils/config.js'
//获取应用实例
var app = getApp()
// import { adapterDegree } from '../../utils/config.js'
import { parseTime } from '../../utils/moment.js'
Page({
  data: {
    // 数组
    data: [],

    boxSize: 17,

    // 生成按钮禁用状态
    btnDisabled: false,

    // 生成情况
    generateOk: false,

    // 遮挡控制
    shade: true,

    // 初次渲染完成前时不显示按钮
    init: false,

    // panel位置
    panelPosition: {
      dx: -102,
      dy: -112
    },
    panelShowAnimation: {},
    showPanel: false,

    boxCoords: {
      x: 0,
      y: 0
    },

    // pannel定位用
    deviceInfo: null,
    panelData: [1, 2, 3, 4, 5, 6, 7, 8, 9],

    sideSize: 0,
    // tooltip
    toolTip: {
      // ready, end, timing, pause, complete
      type: 'ready',
      content: '点击数独中的任意位置开始计时'
    },

    // 数独完成情况
    complete: false,
    // 数独剩余数字情况，索引排序
    leave: [9, 9, 9, 9, 9, 9, 9, 9, 9],

    menuAnimationTop: null,
    menuAnimationTop: null,
    menuAnimationMiddle: null,
    menuAnimationBottom: null,
    drawerToggle: false,
    drawer: null,

    showOptionAnimation: null,

    toView: 'view0',

    avatarPosition: {
      x: -25,
      y: 25
    },
    avatarTitle: {
      text: '世外数独互动',
      step: 0
    },

    showResult: false,
    resultIsGenerating: true,

    optimization: false,

    // showCanvasResult: false
    // end data
    showOption: false,
  },
  degree: .3,
  percentDegree: '30%',
  degreeTitle: '中等，难易程度：3',
  avatarShowTimes: 0,

  generateSudokuSuccess: false,
  // 回退
  // history: [],

  // 数独开始操作时间
  startTime: 0,
  pauseTime: 0,

  timeInterval: null,

  canvasResult: null,

  panelOpen: false,

  initArray(type) {
    let array = new Array(9)
    for (let i = 0; i < 9; i++) {
      array[i] = new Array(9)
      for (let j = 0; j < 9; j++) {
        array[i][j] = undefined
      }
    }
    if (type === 'init') {
      this.setData({
        data: array
      })
    }
    return array
  },

  onLoad: function () {
    let deviceInfo = app.globalData.deviceInfo
    // console.log(deviceInfo)
    this.setData({
      deviceInfo: deviceInfo,
      boxSize: (deviceInfo.windowWidth) / 9,
      sideSize: (deviceInfo.windowHeight - deviceInfo.windowWidth) / 2,
    })
    this.initArray('init')
    this.handleGenerateSudoku()
  },

  resetConfig() {
    this.degree = app.globalData.shadeDegree
    this.percentDegree = parseInt(this.degree * 100) + '%'
    this.degreeTitle = app.adapterDegree(this.degree)
    this.setData({
      optimization: app.globalData.optimization
    })
    wx.setNavigationBarTitle({
      title: this.degreeTitle
    })
  },

  reset() {
    this.resetConfig()
    this.hideOption()
    // reset
    clearInterval(this.timeInterval)
    let data = this.data.data
    if (data[0][0] === undefined) {
      return
    }
    // if (!this.data.optimization) {
    data.map((itemRow, idxRow) => {
      itemRow.map((item, idx) => {
        // 从右下角退回
        if (this.data.optimization) {
          item.successAnimation = this.basicAnimation(50, 0).scale(0).step().export()
        } else {
          item.successAnimation = this.basicAnimation(50, (8 - idx + 8 - idxRow) * 50 - 50).scale(0).step().export()
        }
      })
    })
    // }
    this.generateSudokuSuccess = false
    this.startTime = 0
    this.pauseTime = 0
    this.timeInterval = null
    this.canvasResult = null
    this.setData({
      data: data,
      generateOk: false,
      leave: [9, 9, 9, 9, 9, 9, 9, 9, 9],
      toolTip: {
        type: 'ready',
        content: '点击数独中的任意位置开始计时'
      },
      btnDisabled: true,
      shade: true,
      complete: false,
      showResult: false,
      resultIsGenerating: true,
      toView: 'view0'
    })
  },

  handleGenerateSudoku() {
    if (this.data.btnDisabled) {
      return
    }
    // !== timing
    if (!this.data.init || this.data.complete || this.data.toolTip.type === 'ready' || this.data.toolTip.type === 'end' || this.data.toolTip.type === 'drop') {
      this.generateSudoku()
    } else {
      wx.showModal({
        title: '提示',
        content: '您本局成绩将不被记录，是否继续？',
        success: res => {
          if (res.confirm) {
            this.generateSudoku()
          } else {
            wx.stopPullDownRefresh()
          }
        }
      })
    }
  },

  generateSudoku() {
    this.reset()
    let result = null
    while (!this.generateSudokuSuccess) {
      result = this.toGenerate()
    }
    wx.stopPullDownRefresh()
    result.map((rowItem, rowIdx) => {
      rowItem.map((item, idx) => {
        result[rowIdx][idx] = {
          value: item,
          show: true,
          // className: 'box',
          x: idx,
          y: rowIdx,
          successAnimation: {}
        }
      })
    })

    if (this.data.shade) {
      this.toggleShade(result, 'init')
    } else {
      this.setData({
        data: result,
      })
    }

    this.setData({
      btnDisabled: false,
      generateOk: true,
      init: true,
    })
  },

  toGenerate() {
    // 只取值不刷新UI, 避免box为空
    let array = this.initArray()
    let time = new Date().getTime()
    for (let j = 0; j < 9; j++) {
      let idxInList = []
      let notComplete = true

      while (notComplete) {
        idxInList = []
        for (let k = 0; k < 9; k++) {
          let avalibIdx = this.avalibleIdx(array[k], k, idxInList)
          if (avalibIdx !== undefined) {
            idxInList.push(avalibIdx)
          }
        }
        if (idxInList.length === 9) {
          notComplete = false
        } else if (new Date().getTime() - time > 1000) {
          return
        }
      }
      // 要return，不map
      for (let n = 0; n < idxInList.length; n++) {
        array[n][idxInList[n]] = j + 1
        if (j === 8 && n === 8) {
          this.generateSudokuSuccess = true
          return array
        }
      }
    }
  },

  avalibleIdx(rowList, idxOfRowList, idxInList) {
    let avalibleList = []
    for (let m = 0; m < 9; m++) {
      if (rowList[m] === undefined && idxInList.indexOf(m) === -1) {
        if (idxOfRowList % 3 === 0) {
          avalibleList.push(m)
        } else {
          let blockLastIndex = idxInList[idxInList.length - 1]
          if ((blockLastIndex < 3 && m < 3) || ((blockLastIndex >= 3 && blockLastIndex < 6) && (m >= 3 && m < 6)) || (blockLastIndex >= 6 && m >= 6)) {
            continue
          } else {
            if (idxOfRowList % 3 === 2) {
              let blockAheadIdx = idxInList[idxInList.length - 2]
              if ((blockAheadIdx < 3 && m < 3) || ((blockAheadIdx >= 3 && blockAheadIdx < 6) && (m >= 3 && m < 6)) || (blockAheadIdx >= 6 && m >= 6)) {
                continue
              }
            }
            avalibleList.push(m)
          }
        }
      }
    }
    let resultList = Array.from(new Set(avalibleList))
    return resultList[Math.floor(Math.random() * resultList.length)]
  },

  toggleShade(newData, from = 'btn', callback) {
    // console.log(this.degree)
    // console.log('in')
    // 点击事件默认传递一个事件对象，当参数是数组时表示初始化，并且为遮挡状态
    let isArray = newData instanceof Array
    let templist = isArray ? newData : this.data.data
    let leave = [9, 9, 9, 9, 9, 9, 9, 9, 9]
    templist.map(itemRow => (
      itemRow.map((item, idx) => {
        let result = isArray ? ((Math.random() >= this.degree) ? true : false) : (this.data.shade ? true : ((Math.random() >= this.degree) ? true : false))
        itemRow[idx].show = result ? true : false
        // itemRow[idx].className = result ? 'box' : 'box blank'
        item.duplicate = []
        item.fill = ''
        item.rcl = false
        item.showSame = false
        let leaveIdx = item.value - 1
        // 切换时show的item会再减1
        leave[leaveIdx] = item.show ? leave[leaveIdx] - 1 : leave[leaveIdx]
      })
    ))

    this.setData({
      data: templist,
      shade: isArray ? true : !this.data.shade,
      leave: leave
    })

    this.togglePanel(false)

    if (from === 'init') {
      // init时如果完成数独不记录
      this.isComplete(templist, true)
    } else {
      clearInterval(this.timeInterval)
      // 查看结果后处理办法
      let tooltip = this.data.toolTip
      tooltip = {
        type: 'drop',
        content: '请重新生成数独'
      }
      this.setData({
        toolTip: tooltip
      })
      this.isComplete(templist)
      // leave = this.data.shade ? [0,0,0,0,0,0,0,0,0] : leave
    }

  },

  timing() {
    if (this.data.toolTip.type === 'timing') {
      return
    }
    this.startTime = this.startTime || new Date().getTime()
    this.computeTime()
    this.timeInterval = setInterval(() => {
      this.computeTime()
    }, 1000)
  },

  computeTime(){
    this.pauseTime ? this.pauseTime += 1000 : ''
    let time = Math.round(((this.pauseTime || new Date().getTime()) - this.startTime) / 1000)
    let m = Math.floor(time / 60)
    let s = time % 60 < 10 ? '0' + time % 60 : time % 60
    let tooltip = {
      type: 'timing',
      content: m + ':' + s,
    }
    this.setData({
      toolTip: tooltip
    })
  },
  

  pause() {
    clearInterval(this.timeInterval)
    this.pauseTime = this.pauseTime || (new Date().getTime())
    // console.log(this.pauseTime)
    let tooltip = this.data.toolTip
    this.setData({
      toolTip: {
        type: 'pause',
        content: '用时' + tooltip.content + ', 已暂停'
      }
    })
    this.clearStyle()
  },

  carryon() {
    this.timing()
  },

  basicAnimation(duration, delay) {
    let animation = wx.createAnimation({
      duration: duration || 500,
      timingFunction: "ease",
      delay: delay || 0
    });
    return animation;
  },

  menuAnimate() {
    if (this.data.drawerToggle) {
      this.toggleDrawerHandler('toClose')
    } else {
      this.toggleDrawerHandler('toOpen')
      // console.log(this.data.toolTip)
      if (this.data.toolTip.type === 'timing') {
        this.pause()
      }
    }
  },

  closeDrawer() {
    this.toggleDrawerHandler('toClose')
  },

  toggleDrawerHandler(type) {
    let toggle = true,
      menuDx = '70%',
      menuRotate = 30,
      menuWidth = 30,
      drawDx = '30%',
      // h = 3,
      w = 22
    if (type === 'toClose') {
      toggle = false,
        menuDx = 0,
        menuRotate = 0,
        menuWidth = 15,
        drawDx = '100%',
        // h = 2,
        w = 20
    }
    this.setData({
      drawerToggle: toggle,
      menuAnimation: this.basicAnimation().translate(menuDx).step().export(),
      menuAnimationTop: this.basicAnimation().rotate(-menuRotate).width(w).step().export(),
      menuAnimationMiddle: this.basicAnimation().width(menuWidth).step().export(),
      menuAnimationBottom: this.basicAnimation().rotate(menuRotate).width(w).step().export(),
      drawer: this.basicAnimation().right(drawDx).step().export()
    })
  },

  togglePanel(toShow) {
    if (this.data.optimization) {
      if (!toShow) {
        this.panelOpen = false
        this.setData({
          panelPosition: {
            dx: -102,
            dy: -112
          },
        })
      } else {
        this.panelOpen = true
        this.setData({
          panelShowAnimation: this.basicAnimation(200).scale(1).step().export()
        })
      }
    } else {
      let scale = 0
      this.panelOpen = false
      if (toShow) {
        scale = 1
        this.panelOpen = true
      }
      this.setData({
        panelShowAnimation: this.basicAnimation(200).scale(scale).step().export()
      })
    }
  },

  clearStyle(type = 'all') {
    let data = this.data.data
    data.map((rowItem, rowIdx) => {
      rowItem.map((item, idx) => {
        if (type === 'rcl') {
          item.rcl = false
        } else if (type === 'same') {
          item.showSame = false
        } else {
          item.rcl = false
          item.showSame = false
        }
      })
    })
    this.setData({
      data: data
    })
  },

  tapBox(e) {
    let tooltipType = this.data.toolTip.type
    if (this.data.complete || tooltipType === 'pause' || tooltipType === 'end' || tooltipType === 'complete') {
      return
    }
    this.hideOption()
    let show = e.currentTarget.dataset.show
    let value = e.currentTarget.dataset.value

    // 激活的哪个box
    let data = this.data.data
    let boxCoords = this.data.boxCoords
    boxCoords.x = e.currentTarget.dataset.x
    boxCoords.y = e.currentTarget.dataset.y

    if (show) {
      if (this.panelOpen) {
        // 如果点show的格子，panel还开着，先不显示相同数字
        this.togglePanel(false)
      } else {
        this.togglePanel(false)
        if (data[boxCoords.y][boxCoords.x].showSame) {
          this.clearStyle()
        } else {
          this.clearStyle('rcl')
          this.showSame(true, value)
        }
        this.setData({
          toView: 'view' + (value - 1)
        })
      }
      return
    }

    this.showSame(false)
    // 判断为null的作用是避免瞬时多次点击
    if (tooltipType !== 'drop' && this.timeInterval === null) {
      this.timing()
    }

    // panel浮层位置
    let panelPosition = this.data.panelPosition
    // panel的一半是51
    panelPosition.dx = this.data.deviceInfo.screenWidth/2 - 50 
    //e.detail.x + 50
    panelPosition.dy = this.data.deviceInfo.screenWidth + 115
    //+ this.deviceInfo.windowWidth
    //e.detail.y + 50

    let screenWidth = this.data.deviceInfo.screenWidth
    // 触摸点位置加半个panel超出屏幕宽度
    /*if (e.detail.x + 200 >= screenWidth) {
      panelPosition.dx = e.detail.x - 200
      panelPosition.dy = e.detail.y - 100
    } else if (panelPosition.dx <= 0) {
      // panel左边超出屏幕边界
      panelPosition.dx = e.detail.x
    }*/

    data.map((rowItem, rowIdx) => {
      rowItem.map((item, idx) => {
        item.rcl = false
        if (rowIdx === boxCoords.y || idx === boxCoords.x) {
          item.rcl = true
        }
      })
    })
    this.about9Box(boxCoords.x, boxCoords.y).map(item => {
      data[item.y][item.x].rcl = true
    })

    // panel数字
    let panelData = [1, 2, 3, 4, 5, 6, 7, 8, 9]
    if (data[boxCoords.y][boxCoords.x].fill) {
      let idx = panelData.indexOf(data[boxCoords.y][boxCoords.x].fill)
      panelData.splice(idx, 1)
      panelData.splice(4, 0, 'x')
    }

    this.setData({
      panelPosition: panelPosition,
      boxCoords: boxCoords,
      data: data,
      panelData: panelData,
    })
    this.togglePanel(true)
  },
//Change!
  countDuplication(value, item, target) {
    let boxCoords = this.data.boxCoords
    let targetPosition = parseInt(boxCoords.y + '' + boxCoords.x)
    let findTargetPositionInList = item.duplicate.lastIndexOf(targetPosition)
    if (value === 'x') {
      if (item.value === target.fill) {
        item.duplicate.splice(findTargetPositionInList, 1)
      }
    } else {
      if (item.value === value) {
        item.duplicate.push(targetPosition)
      } else {
        if (findTargetPositionInList >= 0) {
          item.duplicate.splice(findTargetPositionInList, 1)
        }
      }
    }
  },

  showCbg() {
    let data = this.data.data
    data.map((itemRow, idxRow) => {
      itemRow.forEach((item, idx) => {
        // (idx + idxRow) * 50 - 50 => 求 i * j格子的值，即 j + i - 1
        item.successAnimation = this.basicAnimation(50, (idx + idxRow) * 50 - 50).scale(1).step().export()
      })
    })
    this.setData({
      data: data
    })
  },



  isComplete(data, init = false) {
    // console.log(leave)
    // let result = leave.reduce((p, n) => p + n)
    // if (result === 0) {
    // item为show不检查为false
    // item不为show的情况下item.fill为空为true, item.fill !== item.valueweitrue
    let unComplete = data.some(itemRow => (itemRow.some(item => (!item.show ? (item.fill ? (item.fill !== item.value) : true) : false))))
    // console.log(unComplete)
    if (unComplete) {
      this.setData({
        complete: false,
      })
      return
    }

    // console.log(init)

    if (init) {
      // 取消初始化的成绩记录
      let tooltip = this.data.toolTip
      tooltip = {
        type: 'end',
        content: '没有可以填的空格，请刷新再试或调整难易程度！'
      }
      this.setData({
        toolTip: tooltip,
        complete: true,
        shade: false
      })
      return
    }

    this.clearStyle()
    this.togglePanel(false)

    // console.log(this.data.toolTip)
    if (this.data.toolTip.type === 'drop') {
      this.setData({
        complete: true,
        shade: false,
        showResult: false
      })
      return
    }

    this.data.optimization ? '' : this.showCbg()

    clearInterval(this.timeInterval)
    let tooltip = this.data.toolTip
    let showTime = tooltip.type === 'ready' ? '0:00' : (tooltip.type === 'timing' ? tooltip.content : '')
    tooltip = {
      type: 'complete',
      content: '用时' + showTime + ', 恭喜！'
    }
    this.setData({
      toolTip: tooltip,
      complete: true,
      shade: false,
      showResult: true
    })

    // 绘制结果
    this.drawCanvas(showTime)
    // 存缓存
    let now = new Date().getTime()
    let backData = {
      startTime: this.startTime,
      recordTime: now,
      timeUse: this.pauseTime ? (this.pauseTime - this.startTime) : (now - this.startTime),
      showTime: showTime,
      shadeDegree: app.globalData.shadeDegree
    }

    // 即生成0到9的key
    let storagePrimaryKey = app.adapterDegree(this.degree, 'range')[1] / 10 - 1

    wx.getStorage({
      key: 'record' + storagePrimaryKey,
      success: function (res) {
        let records = res.data
        records.push(backData)
        wx.setStorage({
          key: 'record' + storagePrimaryKey,
          data: records,
        })
      },
      fail: () => {
        let records = []
        records.push(backData)
        wx.setStorage({
          key: 'record' + storagePrimaryKey,
          data: records,
        })
      }
    })

    // 存一个总的记录，记录各等级最短时间等等
    wx.getStorage({
      key: 'records',
      success: function (res) {
        let records = res.data
        // 用时短则替换
        let target = records[storagePrimaryKey]
        let counts = target.counts
        let diffValue = (target.timeUse) - (backData.timeUse)
        if (diffValue > 0 || (target.recordTime - target.startTime === 0)) {
          records.splice(storagePrimaryKey, 1, backData)
        }
        records[storagePrimaryKey].counts = counts + 1

        wx.setStorage({
          key: 'records',
          data: records,
        })
      },
      fail: () => {
        let records = []
        for (let i = 0; i < 10; i++) {
          if (i === storagePrimaryKey) {
            backData.counts = 1
            records.push(backData)
            continue
          }
          records.push({
            startTime: 0,
            recordTime: 0,
            counts: 0,
          })
        }
        wx.setStorage({
          key: 'records',
          data: records,
        })
      }
    })

    // 存最近50条记录
    wx.getStorage({
      key: 'recordLatest',
      success: function (res) {
        let records = res.data
        if (records.length > 50) {
          records.shift()
        }
        records.push(backData)
        wx.setStorage({
          key: 'recordLatest',
          data: records,
        })
      },
      fail: () => {
        let records = []
        records.push(backData)
        wx.setStorage({
          key: 'recordLatest',
          data: records,
        })
      }
    })
    // }
  },

  panelTap(e) {
    let value = e.currentTarget.dataset.value
    let boxCoords = this.data.boxCoords
    let data = this.data.data

    // 行和列
    data.map((rowItem, rowIdx) => {
      rowItem.map((item, idx) => {
        // 只找show的
        if (item.show) {
          if ((rowIdx === boxCoords.y || idx === boxCoords.x) && (!(rowIdx === boxCoords.y && idx === boxCoords.x))) {
            this.countDuplication(value, item, data[boxCoords.y][boxCoords.x])
          }
        }
      })
    })

    // 九宫格
    this.about9Box(boxCoords.x, boxCoords.y).map(item => {
      if (boxCoords.x !== item.x || boxCoords.y !== item.y) {
        let box = data[item.y][item.x]
        if (box.show) {
          // 排除在同行或同列的，上一步已经处理过
          if (item.y !== boxCoords.y && item.x !== boxCoords.x) {
            this.countDuplication(value, box, data[boxCoords.y][boxCoords.x])
          }
        }
      }
    })

    // 计算剩余数字
    let leave = this.data.leave.slice()
    let target = data[boxCoords.y][boxCoords.x]
    if (value === 'x') {
      let idx = target.fill
      leave[idx - 1] = leave[idx - 1] + 1
      // } else if (target.fill === target.value){
    } else {
      if (target.fill === '') {
        leave[value - 1] = leave[value - 1] - 1
      } else {
        let idx = parseInt(target.fill)
        leave[idx - 1] = leave[idx - 1] + 1
        leave[value - 1] = leave[value - 1] - 1
      }
    }


    data[boxCoords.y][boxCoords.x].fill = (value === 'x') ? '' : value

    this.isComplete(data)

    this.setData({
      data: data,
      leave: leave
    })

    this.clearStyle('rcl')
    this.togglePanel(false)

    // 最多存100条记录
    // if (this.history.length === 100) {
    //   this.history.pop()
    // }

    // this.history.push({
    //   boxCoords: boxCoords,
    //   data: data[boxCoords.y][boxCoords.x],
    //   panelValue: value
    // })

  },

  about9Box(x, y) {
    let range = {}
    let list = []
    if (x % 3 === 0) {
      // x在0, 3, 6列
      range.x = [x, x + 1, x + 2]
    } else if (x % 3 === 1) {
      // x在1，4，7列
      range.x = [x - 1, x, x + 1]
    } else {
      // x在2，5，8列
      range.x = [x - 2, x - 1, x]
    }
    if (y % 3 === 0) {
      // y在0, 3, 6行
      range.y = [y, y + 1, y + 2]
    } else if (y % 3 === 1) {
      // y在1，4，7行
      range.y = [y - 1, y, y + 1]
    } else {
      // y在2，5，8行
      range.y = [y - 2, y - 1, y]
    }
    range.y.map(y => {
      range.x.map(x => {
        list.push({
          x: x,
          y: y
        })
      })
    })
    // 返回当前九宫格坐标
    return list
  },

  hidePanel() {
    this.togglePanel(false)
  },

  showSame(showSame, value) {
    let data = this.data.data
    data.map((rowItem, rowIdx) => {
      rowItem.map(item => {
        if (item.show) {
          if (showSame) {
            if (item.value === value) {
              item.showSame = true
            } else {
              delete item.showSame
            }
          } else {
            delete item.showSame
          }
        }
      })
    })
    this.setData({
      data: data
    })
  },

  showOption() {
    if (this.data.showOption) {
      this.hideOption()
    } else {
      this.setData({
        showOption: true,
        showOptionAnimation: this.basicAnimation().scale(1).step().export()
      })
    }
  },

  hideOption() {
    this.setData({
      showOption: false,
      showOptionAnimation: this.basicAnimation(300).scale(0).step().export()
    })
  },

  tapRowToShowSame(e) {
    if(this.data.toolTip.type === 'pause'){
      return
    }
    this.showSame(true, e.currentTarget.dataset.idx + 1)
  },

  moveAvatarEnd(e) {
    let position = {
      x: -25,
      y: 25
    }
    this.setData({
      avatarPosition: position
    })
  },
  tapAvatar() {
    let step = this.data.avatarTitle.step
    if (step > 0) {
      return
    }
    let showText = '别点我'
    if (this.avatarShowTimes === 1) {
      showText = '又是你'
    } else if (this.avatarShowTimes === 2) {
      showText = '还是你'
    } else if (this.avatarShowTimes === 3) {
      showText = '怎么老是你'
    } else if (this.avatarShowTimes > 3) {
      showText = '拉黑你'
      // disabled
    }
    this.setData({
      avatarTitle: {
        text: showText,
        step: 1,
      }
    })
    // 超过三次后不再进行对话
    if (this.avatarShowTimes > 3) {
      this.tapAvatarShowTitle('世外数独互动', 0, 1500, null)
      return
    }
    this.tapAvatarShowTitle('......', 2, 1000, null)
    this.tapAvatarShowTitle('这下可好', 3, 2500, null)
    this.tapAvatarShowTitle('我忘了自己叫啥了', 4, 4000, null)
    this.tapAvatarShowTitle('怎么办', 5, 6000, null)
    this.tapAvatarShowTitle('嗯？我想想...', 6, 8000, null)
    this.tapAvatarShowTitle('好像设定过', 7, 9000, null)
    this.tapAvatarShowTitle('长按我可以还原', 8, 10000, res => {
      this.avatarShowTimes++
    })

  },

  longTapAvatar(e) {
    if (this.data.avatarTitle.step === 8) {
      let avatarTitle = {
        text: '是我，不是上面那位！',
        step: 9
      }
      this.setData({
        avatarTitle: avatarTitle
      })
    }
  },

  tapAvatarShowTitle(text, step, delay, callback) {
    setTimeout(() => {
      let avatarTitle = {
        text: text,
        step: step
      }
      this.setData({
        avatarTitle: avatarTitle
      })
      callback ? callback() : ''
    }, delay || 2000)
  },

  longTapAvatarTitle(e) {
    let step = this.data.avatarTitle.step
    if (step === 8 || step === 9) {
      this.tapAvatarShowTitle('谢谢', 10, 0, res => {
        this.tapAvatarShowTitle('世外数独互动', 0, 0, null)
      })
    }
  },
  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh: function () {
    this.handleGenerateSudoku()
  },

  drawCanvas(showTime) {
    const ctx = wx.createCanvasContext('canvasResult')
    ctx.setFontSize(12)
    ctx.setFillStyle('#222222')
    ctx.setTextAlign('left')
    ctx.setTextBaseline('middle')
    let cw = this.data.deviceInfo.windowWidth * .7
    let ch = this.data.sideSize - 5
    ctx.clearRect(0, 0, cw, ch)
    let padding = 10
    let lineHeight = (ch - 10 - 10) / 4
    let alignCenter = cw / 2
    ctx.save()
    ctx.setFillStyle('#ffffff')
    ctx.fillRect(0, 0, cw, ch)
    ctx.restore()
    ctx.fillText('遮挡比例： ' + this.percentDegree, padding * 2, padding + lineHeight * 1 - lineHeight * .5)
    ctx.fillText('' + this.degreeTitle, padding * 2, padding + lineHeight * 2 - lineHeight * .5)
    ctx.fillText('用时： ' + showTime, padding * 2, padding + lineHeight * 3 - lineHeight * .5)
    ctx.fillText('完成时间： ' + parseTime(new Date().getTime()), padding * 2, padding + lineHeight * 4 - lineHeight * .5)
    ctx.save()
    ctx.beginPath()
    ctx.setStrokeStyle('#ffc107')
    ctx.setLineWidth(2 * 2)
    // 6为字体大小的一半
    ctx.moveTo(padding, padding + lineHeight * 1 - lineHeight * .5 - 6)
    ctx.lineTo(padding, padding + lineHeight * 4 - lineHeight * .5 + 6)
    ctx.stroke()
    ctx.restore()
    ctx.draw()

    this.generateResult(this.data.sideSize - 5)
  },
  generateResult(height) {
    // 最长一行时间的宽度大概为200
    // 为防止底部黑边，拉伸图片，比例为分享图片比例
    wx.canvasToTempFilePath({
      canvasId: 'canvasResult',
      x: 0,
      y: 0,
      width: 210,
      height: height,
      destWidth: 210,
      destHeight: 210 / 1.27,
      success: res => {
        // console.log(res)
        // let pic =
        this.canvasResult = res.tempFilePath

        this.setData({
          resultIsGenerating: false
        })
      },
      fail: res => {
        // console.log(res)
        setTimeout(() => {
          this.generateResult(height)
        }, 100)
      }
    })
  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage: function (e) {
    let title, img = ''
    let range = app.adapterDegree(this.degree, 'range')[1] / 10 - 1
    let share = app.globalData.share
    if (e.from === 'button') {
      img = this.canvasResult ? this.canvasResult : ''
      title = (share && share.range[range]) || '我在世外数独互动完成了一项数独挑战，成绩如下：'
      // console.log(img)
    } else {
      title = (share && share.index) || '生命因创造而有趣'
    }
    return {
      title: title,
      path: '/pages/index/index',
      imageUrl: img,
    }
  },

  route(e) {
    let pageSize = getCurrentPages().length
    // console.log(getCurrentPages())
    let type = e.currentTarget.dataset.type
    if(type === 'index'){
      this.closeDrawer()
    } else {
      if (pageSize < 5) {
        wx.navigateTo({
          url: `/pages/${type}/index`,
        })
      } else {
        wx.redirectTo({
          url: `/pages/${type}/index`,
        })
      }
    }
  },

  // onShow: function(){
  //   console.log(getCurrentPages())
  // }
})
