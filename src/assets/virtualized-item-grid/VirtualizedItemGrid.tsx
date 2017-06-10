import * as React from 'react';
import {AutoSizer, CellMeasurer, CellMeasurerCache, Grid, GridCellProps, ScrollParams} from 'react-virtualized';
import defaultRenderCellWrapper from './defaultRenderCellWrapper';

type IdealItemWidthInput = {
    containerWidth: number,
    containerHeight: number,
};

type RenderItemInput<TItem> = {
    isVisible: boolean,
    isScrolling: boolean,
    columnIndex: number,
    columnCount: number,
    columnWidth: number,
    rowIndex: number,
    rowCount: number,
    item: TItem,
    index: number,
};

type RenderHeaderInput = {
    isVisible: boolean,
    isScrolling: boolean,
};

type RenderFooterInput = {
    isVisible: boolean,
    isScrolling: boolean,
};

type Style = {};

type RenderCellWrapperInput = {
    style: Style,
    children: any,
    isHeader: boolean,
    isFooter: boolean,
    isItem: boolean,
};

type Props<TItem> = {
    minItemWidth: number | ((input: IdealItemWidthInput) => number);
    dynamicRowHeight?: boolean;
    items: Array<any>;
    renderItem: (input: RenderItemInput<any>) => any;
    overscanRowCount?: number;
    header?: any | ((input: RenderHeaderInput) => any) | null;
    footer?: any | ((input: RenderFooterInput) => any) | null;
    renderCellWrapper?: (input: RenderCellWrapperInput) => any;

    // Grid props
    className?: string;
    onScroll?: (params: ScrollParams) => any;
};

// NOTE: Component is intentionally used instead of PureComponent,
// as renderItem's internals may adjust independent of props provided to
// this component
export default class VirtualizedItemGrid<TItem> extends React.PureComponent<Props<TItem>, {}> {

    public static defaultProps = {
        dynamicRowHeight: false,
        overscanRowCount: 2,
        header: (null),
        footer: (null),
        renderCellWrapper: defaultRenderCellWrapper,
    };

    getMinItemWidth(containerWidth: number, containerHeight: number) {
        const {minItemWidth} = this.props;
        if (typeof minItemWidth === 'function') {
            return minItemWidth({containerWidth, containerHeight});
        }
        return minItemWidth;
    }

    renderHeader(style: Style,
                 header: (any | ((input: RenderHeaderInput) => any)),
                 isVisible: boolean,
                 isScrolling: boolean) {

        const {renderCellWrapper} = this.props;
        const CellWrapper = renderCellWrapper as (input: RenderCellWrapperInput) => any;

        let element;
        if (typeof header === 'function') {
            const Header = header;
            element = <Header isVisible={isVisible} isScrolling={isScrolling}/>;
        } else {
            element = header;
        }
        return (
            <CellWrapper
                key="header"
                style={style}
                isHeader={true}
                isFooter={false}
                isItem={false}
                children={element}
            />
        );
    }

    renderFooter(style: Style,
                 footer: (any | ((input: RenderFooterInput) => any)),
                 isVisible: boolean,
                 isScrolling: boolean) {

        const {renderCellWrapper} = this.props;
        const CellWrapper = renderCellWrapper as (input: RenderCellWrapperInput) => any;

        let element;
        if (typeof footer === 'function') {
            const Footer = footer;
            element = <Footer isVisible={isVisible} isScrolling={isScrolling}/>;
        } else {
            element = footer;
        }
        return (
            <CellWrapper
                key="footer"
                style={style}
                isHeader={false}
                isFooter={true}
                isItem={false}
                children={element}
            />
        );
    }

    renderItem(style: Style, element: any, key?: string) {
        const {renderCellWrapper} = this.props;
        const CellWrapper = renderCellWrapper as (input: RenderCellWrapperInput) => any;

        return (
            <CellWrapper
                key={key || 'item'}
                style={style}
                isHeader={false}
                isFooter={false}
                isItem={true}
                children={element}
            />
        );
    }

    renderCell(cellData: GridCellProps,
               columnCount: number,
               rowCount: number,
               columnWidth: number,
               containerWidth: number,
               cache: CellMeasurerCache) {

        const {key, parent, style, isVisible, isScrolling, columnIndex, rowIndex} = cellData;
        const visible = isVisible || false;
        const scrolling = isScrolling || false;
        const {items, renderItem: ItemComponent, header, footer} = this.props;
        let normalizedRowIndex = rowIndex;
        if (header) {
            if (rowIndex === 0) {
                if (columnIndex === 0) {
                    return this.renderHeader({...style, width: containerWidth}, header, visible, scrolling);
                }
                return null;
            }
            normalizedRowIndex -= 1;
        }
        if (footer && normalizedRowIndex === rowCount) {
            if (columnIndex === 0) {
                return this.renderFooter({...style, width: containerWidth}, footer, visible, scrolling);
            }
            return null;
        }
        const index = (normalizedRowIndex * columnCount) + columnIndex;
        if (index >= items.length) {
            return null;
        }
        const item = items[index];
        if (item === undefined) {
            return null;
        }

        const element = (
            <CellMeasurer
                cache={cache}
                columnIndex={columnIndex}
                key={key}
                parent={parent as any}
                rowIndex={rowIndex}
            >
                <ItemComponent
                    isVisible={visible}
                    isScrolling={scrolling}
                    columnIndex={columnIndex}
                    columnCount={columnCount}
                    columnWidth={columnWidth}
                    rowIndex={normalizedRowIndex}
                    rowCount={rowCount}
                    item={items[index]}
                    index={index}
                />
            </CellMeasurer>
        );
        return this.renderItem(style, element, key);
    }

    renderWithKnownSize(containerWidth: number, containerHeight: number) {
        if (!containerWidth) {
            return null;
        }
        const {
            minItemWidth: miw,
            dynamicRowHeight,
            items,
            renderItem,
            overscanRowCount,
            header,
            footer,
            renderCellWrapper,
            ...passThroughProps
        } = this.props;

        const itemCount = items.length;

        const minItemWidth = Math.max(1, this.getMinItemWidth(containerWidth, containerHeight));

        // Max whole number of columns that will fit
        const columnCount = Math.trunc(containerWidth / minItemWidth);
        // Truncate to whole number pixels (otherwise virtualscroll puts last item on next line)
        const columnWidth = Math.trunc(containerWidth / columnCount);

        const rowCount = Math.ceil(itemCount / columnCount);

        const extraRowCount = (header ? 1 : 0) + (footer ? 1 : 0);

        const cache = new CellMeasurerCache({
            keyMapper: () => `${containerWidth}:${containerHeight}:${header ? 1 : 0}:${footer ? 1 : 0}`,
            defaultWidth: columnWidth,
            fixedWidth: true
        });

        const cellRenderer = (data: GridCellProps) =>
            this.renderCell(data, columnCount, rowCount, columnWidth, containerWidth, cache);

        return (
            <Grid
                cellRenderer={cellRenderer}
                columnCount={columnCount}
                columnWidth={columnWidth}
                height={containerHeight}
                rowCount={rowCount + extraRowCount}
                deferredMeasurementCache={cache}
                rowHeight={cache.rowHeight as any}
                width={containerWidth}
                overscanRowCount={overscanRowCount}
                {...passThroughProps}
            />
        );
    }

    render() {
        return (
            <AutoSizer>
                {({width, height}) => this.renderWithKnownSize(width, height)}
            </AutoSizer>
        );
    }
}