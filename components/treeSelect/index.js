import React, { Component } from 'react';
import { StyleSheet, View, TextInput, FlatList, Text, TouchableOpacity } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { breadthFirstRecursion } from '../utils/menutransform';
import {layoutSize} from "../utils/layout";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  textName: {
    fontSize: layoutSize.LAYOUT_14,
    marginLeft: 5
  },
  contentContainer: {
    paddingBottom: layoutSize.LAYOUT_18,
    backgroundColor: 'white',
  },
  collapseIcon: {
    width: 0,
    height: 0,
    marginRight: 2,
    borderStyle: 'solid',
  }
});

export default class TreeSelect extends Component {
  constructor(props) {
    super(props);
    this.routes = [];
    this.state = {
      nodesStatus: this._initNodesStatus(),
      currentNode: this._initCurrentNode(),
      searchValue: ''
    };
  }

  _initCurrentNode = () => {
    const { defaultSelectedId, selectType } = this.props;
    if (selectType === 'multiple') {
      return defaultSelectedId || [];
    }
    return defaultSelectedId && defaultSelectedId[0] || null;
  };

  _initNodesStatus = () => {
    const { isOpen = false, data, openIds = [], defaultSelectedId = [] } = this.props;
    const nodesStatus = new Map();
    if (!isOpen) {
      if (openIds && openIds.length) {
        for (let id of openIds) { // eslint-disable-line
          const routes = this._find(data, id);
          routes.map(parent => nodesStatus.set(parent.id, true));
        }
      }
      // 设置默认选中时父节点的展开操作
      if (defaultSelectedId && defaultSelectedId.length) {
        for (let id of defaultSelectedId) { // eslint-disable-line
          const routes = this._find(data, id);
          routes.map(parent => nodesStatus.set(parent.id, true));
        }
      }
      return nodesStatus;
    }
    breadthFirstRecursion(data).map(item => nodesStatus.set(item.id, true));
    return nodesStatus;
  };

  _find = (data, id) => {
    const stack = [];
    let going = true;

    const walker = (childrenData, innerId) => {
      childrenData.forEach(item => {
        if (!going) return;
        stack.push({
          id: item.id,
          name: item.name,
          parentId: item.parentId
        });
        if (item['id'] === innerId) {
          going = false;
        } else if (item['children']) {
          walker(item['children'], innerId);
        } else {
          stack.pop();
        }
      });
      if (going) stack.pop();
    };

    walker(data, id);
    return stack;
  };

  _onPressCollapse = ({ e, item }) => { // eslint-disable-line
    const { data, selectType, leafCanBeSelected } = this.props;
    const { currentNode } = this.state;
    const routes = this._find(data, item.id);

    this._collapseNeigbour(item);
    this.setState((state) => {
      const nodesStatus = new Map(state.nodesStatus);
      nodesStatus.set(item && item.id, !nodesStatus.get(item && item.id)); // toggle

      // 计算currentNode的内容
      if (selectType === 'multiple') {
        const tempCurrentNode = currentNode.includes(item.id) ?
          currentNode.filter(nodeid => nodeid !== item.id) : currentNode.concat(item.id)
        if (leafCanBeSelected) {
          return { nodesStatus };
        }
        return { currentNode: tempCurrentNode, nodesStatus };
      } else {
        if (leafCanBeSelected) {
          return { nodesStatus };
        }
        return { currentNode: item.id, nodesStatus };
      }
    }, () => {
      const { onClick } = this.props;
      onClick && onClick({ item, routes, currentNode: this.state.currentNode });
    });
  };

  _onClickLeaf = ({ e, item }) => { // eslint-disable-line
    const { onClickLeaf, onClick, selectType, leafCanBeSelected } = this.props;
    const { data } = this.props;
    const { currentNode } = this.state;
    const routes = this._find(data, item.id);
    this.setState((state) => {
      // 计算currentNode的内容
      if (selectType === 'multiple') {
        const tempCurrentNode = currentNode.includes(item.id) ?
          currentNode.filter(nodeid => nodeid !== item.id) : currentNode.concat(item.id)
        return {
          currentNode: tempCurrentNode,
        };
      } else {
        return {
          currentNode: item.id
        };
      }
    }, () => {
      onClick && onClick({ item, routes, currentNode: this.state.currentNode });
      onClickLeaf && onClickLeaf({ item, routes, currentNode: this.state.currentNode });
    });
  };

  _renderTreeNodeIcon = (isOpen) => {
    const { isShowTreeId = false, selectedItemStyle, itemStyle, treeNodeStyle } = this.props;
    const collapseIcon = isOpen ? {
      borderRightWidth: 5,
      borderRightColor: 'transparent',
      borderLeftWidth: 5,
      borderLeftColor: 'transparent',
      borderTopWidth: 10,
      borderTopColor: 'black',
    } : {
      borderBottomWidth: 5,
      borderBottomColor: 'transparent',
      borderTopWidth: 5,
      borderTopColor: 'transparent',
      borderLeftWidth: 10,
      borderLeftColor: 'black',
    };
    const openIcon = treeNodeStyle && treeNodeStyle.openIcon;
    const closeIcon = treeNodeStyle && treeNodeStyle.closeIcon;

    return openIcon && closeIcon ? <View>{isOpen ? openIcon : closeIcon}</View> :
      <View style={[styles.collapseIcon, collapseIcon]} />;
  };

  /**
   * When an item is expended, collapse the previous item
   * @param item
   * @private
   */
  _collapseNeigbour( item) {
    const { data } = this.props;
    let routes = this._find(data, item);
    const parent = item.parentId === "owner"
        ? data
        : routes.length
          ? routes[routes.length - 1]
          : []

    parent && parent.map(neigbour => {
      if (neigbour !== item)
        return;

      if (!neigbour.children || !neigbour.children.length)
        return;

      const nodesStatus = new Map(this.state.nodesStatus);
      nodesStatus.set(item && item.id, false); // toggle

      this.setState((state) => {
        this.setState( {
          nodesStatus,
        })
      });
    });
  }

  /**
   * Say if a subelement match the filter criteria
   * @param item
   * @returns {RegExpMatchArray | Promise<Response | undefined> | * | boolean}
   */
  matchStackFilter( item) {
    const { searchValue } = this.state;

    return item.name.match(searchValue) || (item.children && item.children.reduce( (acc, child) => acc || this.matchStackFilter(child), false))
  }

  /**
   * Set status to nodes matching criteria
   */
  getRootFilters() {
    const { searchValue } = this.state;
    const {data} = this.props;

    const filteredItems = data.reduce( (acc, child) => [...acc, ...this.getFilters(child)], []);

    filteredItems.map(item => nodesStatus.set(item.id, true));
  }

  getFilters(item) {
    const { searchValue } = this.state;
    const match = item.name.match(searchValue);

    return match
        ? [ item, ...(item.children && item.children.reduce( (acc, child) => acc || this.matchFilter(child), []))]
        : [];
  }

  _renderRow = ({ item }) => {
    const { currentNode, searchValue } = this.state;
    const { isShowTreeId = false, selectedItemStyle, itemStyle, treeNodeStyle, selectType = 'single', leafCanBeSelected } = this.props;
    const { backgroudColor, fontSize, color } = itemStyle && itemStyle;
    const openIcon = treeNodeStyle && treeNodeStyle.openIcon;
    const closeIcon = treeNodeStyle && treeNodeStyle.closeIcon;

    const selectedBackgroudColor = selectedItemStyle && selectedItemStyle.backgroudColor;
    const selectedFontSize = selectedItemStyle && selectedItemStyle.fontSize;
    const selectedColor = selectedItemStyle && selectedItemStyle.color;
    const isCurrentNode = selectType === 'multiple' ? currentNode.includes(item.id) : (currentNode === item.id);

    if (!this.matchStackFilter(item))
      return null;

    if (item && item.children && item.children.length) {
      const isOpen = this.state.nodesStatus && this.state.nodesStatus.get(item && item.id) || false;
      return (
        <View>
          <TouchableOpacity onPress={(e) => this._onPressCollapse({ e, item })} >
            <View style={{
              flexDirection: 'row',
              backgroundColor: !leafCanBeSelected && isCurrentNode ? selectedBackgroudColor || '#FFEDCE' : backgroudColor || '#fff',
              marginBottom: 2,
              height: 30,
              alignItems: 'center'
            }}
            >
              { this._renderTreeNodeIcon(isOpen) }
              {
                isShowTreeId && <Text style={{ fontSize: 14, marginLeft: 4 }}>{item.id}</Text>
              }
              <Text style={[styles.textName, !leafCanBeSelected && isCurrentNode ?
                { fontSize: selectedFontSize, color: selectedColor } : { fontSize, color }]}>{item.name}</Text>
            </View>
          </TouchableOpacity>
          {
            !isOpen ? null :
              <FlatList
                keyExtractor={(childrenItem, i) => i.toString()}
                style={{ flex: 1, marginLeft: 15 }}
                onEndReachedThreshold={0.01}
                {...this.props}
                data={item.children}
                extraData={this.state}
                renderItem={this._renderRow}
              />
          }
        </View>
      );
    }
    return (
      <TouchableOpacity onPress={(e) => this._onClickLeaf({ e, item })}>
        <View style={{
          flexDirection: 'row',
          backgroundColor: isCurrentNode ? selectedBackgroudColor || '#FFEDCE' : backgroudColor || '#fff',
          marginBottom: 2,
          height: 30,
          alignItems: 'center'
        }}
        >
          <Text
            style={[styles.textName, isCurrentNode ?
              { fontSize: selectedFontSize, color: selectedColor } : { fontSize, color }]}
          >{item.name}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  _onSearch = () => {
    const { searchValue } = this.state;

  };

  _onChangeText = (key, value) => {
    this.setState({
      [key]: value
    });
    this.getRootFilters();
  };

  _renderSearchBar = () => {
    const { searchValue } = this.state;
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 5,
        borderColor: '#cccccc', marginHorizontal: 10 }}>
        <TextInput
          style={{ height: layoutSize.LAYOUT_34, fontSize: layoutSize.LAYOUT_14, paddingHorizontal: 5, flex: 1 }}
          value={searchValue}
          autoCapitalize="none"
          underlineColorAndroid="transparent"
          autoCorrect={false}
          blurOnSubmit
          clearButtonMode="while-editing"
          placeholder="Filter"
          placeholderTextColor="#e9e5e1"
          onChangeText={(text) => this._onChangeText('searchValue', text)}
        />
        <TouchableOpacity onPress={this._onSearch} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: "#ff8800", borderTopRighttRadius: 5, borderBottomRightRadius: 5, height: layoutSize.LAYOUT_34 }} >
          <Ionicons name="ios-search" style={{ color: "#ffffff", fontSize: 24, marginHorizontal: 5 }} />
        </TouchableOpacity>
      </View>
    );
  }
  render() {
    const { data } = this.props;
    return (
      <View style={styles.container}>
        {this._renderSearchBar()}
        <FlatList
          keyExtractor={(item, i) => i.toString()}
          style={{ flex: 1, marginVertical: 5, paddingHorizontal: 15 }}
          onEndReachedThreshold={0.01}
          {...this.props}
          data={data}
          extraData={this.state}
          renderItem={this._renderRow}
        />
      </View>
    );
  }
}
