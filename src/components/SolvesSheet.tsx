import * as React from 'react';
import './SolvesSheet.css';
import VirtualizedItemGrid from './VirtualizedItemGrid';
import { ScrollParams } from 'react-virtualized';
import { animateSpringViaCss } from '../utils/spring';
import CaretUp from 'material-ui-icons/KeyboardArrowUp';
import CaretDown from 'material-ui-icons/KeyboardArrowDown';
import { Solve } from '../services/solves-service';
import { formatTime } from '../utils/Util';

import Button from 'preact-material-components/Button';
import 'preact-material-components/Button/style.css';
import IconButton from 'material-ui/IconButton';

export interface StoreStateProps {
  readonly solves: Solve[];
}

export interface DispatchProps {
  readonly onCellClicked: (solve: Solve) => void;
}

export interface Props extends StoreStateProps, DispatchProps {}

export interface State {
  readonly isExpanded: boolean;
  readonly isAnimating: boolean;
}

enum ScrollState {
  IDLE,
  PANNING,
  SCROLLING
}

class SolvesSheet extends React.PureComponent<Props, State> {
  static collapsedY = '100% - 48px - 48px';
  static expandedY = '0px';

  private scrollState: ScrollState;

  private lastY = -1;
  private lastDy = 0;
  private lastTimestamp = -1;
  private lastVelocity: number;
  private isSecondTouch = false;

  private isScrolledToTop = true;

  private oldTop: number;
  private animationCallback: any;

  private offset = 0;

  private solvesSheet: HTMLElement;
  private grid: any;

  private solvesSheetRef: (solvesSheet: HTMLElement | null) => void;
  private gridRef: (grid: any) => void;

  constructor(props: Props) {
    super(props);
    this.state = {
      isExpanded: false,
      isAnimating: false
    };

    this.solvesSheetRef = (solvesSheet: HTMLElement) =>
      (this.solvesSheet = solvesSheet);
    this.gridRef = (grid: any) => (this.grid = grid);
  }

  handleScroll = (params: ScrollParams) => {
    this.isScrolledToTop = params.scrollTop === 0;
  };

  handleTouchMove = (e: React.TouchEvent<HTMLElement>) => {
    if (this.state.isAnimating) {
      this.stopAnimation();
    }

    let touchobj = e.changedTouches[0];
    const dY = touchobj.clientY - this.lastY;

    if (this.lastY === -1) {
      // Initial touch event: set baseline Y
      this.isSecondTouch = true;
    } else if (this.isSecondTouch) {
      // Second touch event: determine direction, whether to move the sheet
      if (
        (this.scrollState !== ScrollState.SCROLLING &&
          !this.state.isExpanded) ||
        (this.isScrolledToTop && dY > 0)
      ) {
        this.scrollState = ScrollState.PANNING;
        this.updateDOMOffset(dY);
        this.updateDOMGridStyle(true);
      }

      this.isSecondTouch = false;
    } else {
      // Later touch events: move the sheet
      if (this.scrollState === ScrollState.PANNING) {
        this.updateDOMOffset(this.offset + dY);

        this.lastVelocity =
          dY / (performance.now() - this.lastTimestamp) * 1000;
        this.lastTimestamp = performance.now();
      }
    }

    this.lastDy = dY;
    this.lastY = touchobj.clientY;
  };

  handleTouchEnd = (e: React.TouchEvent<HTMLElement>) => {
    if (this.scrollState === ScrollState.PANNING && this.offset !== 0) {
      // If touch move wasn't fired in the last 50ms, velocity is 0
      if (performance.now() - this.lastTimestamp > 50) {
        this.lastVelocity = 0;
      }

      // If moving the sheet, set expanded status
      this.animateExpanded(this.lastDy < 0);
    }

    this.scrollState = ScrollState.IDLE;
    this.isSecondTouch = false;

    this.lastY = -1;
    this.lastDy = 0;
  };

  animateExpanded(isExpanded: boolean) {
    // this.setScrollEnabled(isExpanded);

    this.oldTop = this.solvesSheet.getBoundingClientRect().top;

    this.offset = 0;
    this.setState({
      isExpanded: isExpanded,
      isAnimating: true
    });
  }

  componentDidUpdate(
    prevProps: Readonly<Props>,
    prevState: Readonly<State>,
    prevContext: any
  ): void {
    if (this.state.isAnimating && !prevState.isAnimating) {
      const newTop = this.solvesSheet.getBoundingClientRect().top;

      const invert = newTop - this.oldTop;

      const mass = 50;
      const stiffness = 5;
      const damping = 2 * Math.sqrt(stiffness * mass) * 0.7;

      const mapper = this.state.isExpanded
        ? (x: number) => {
            return `transform: translate3d(0, calc(${SolvesSheet.expandedY} - ${x}px), 0)`;
          }
        : (x: number) => {
            return `transform: translate3d(0, calc(${SolvesSheet.collapsedY} - ${x}px), 0)`;
          };

      const springAnimValues = animateSpringViaCss(
        invert,
        -this.lastVelocity,
        mass,
        stiffness,
        damping,
        mapper
      );

      this.animationCallback = springAnimValues.callback;

      requestAnimationFrame(() => {
        this.solvesSheet.style.cssText = springAnimValues.animationStyles;
      });
    }
  }

  handleAnimationEnd = (e: React.AnimationEvent<HTMLElement>) => {
    if (this.animationCallback) {
      this.animationCallback();
      this.animationCallback = null;
    }

    this.stopAnimation();
  };

  handleCaretClick = () => {
    this.animateExpanded(!this.state.isExpanded);
  };

  stopAnimation() {
    this.solvesSheet.style.cssText = '';
    this.updateDOMTransformStyle();
    this.updateDOMGridStyle(false);
    this.setState({
      isAnimating: false
    });
  }

  getTransformStyle() {
    return this.state.isExpanded
      ? `translate3d(0, calc(${SolvesSheet.expandedY} - ${-this.offset}px), 0)`
      : `translate3d(0, calc(${SolvesSheet.collapsedY} - ${-this
          .offset}px), 0)`;
  }

  updateDOMOffset(offset: number) {
    this.offset = offset;
    this.updateDOMTransformStyle();
  }

  updateDOMGridStyle(panning: boolean) {
    if (this.grid) {
      this.grid._scrollingContainer.style.overflowY =
        this.state.isExpanded && !panning ? 'auto' : 'hidden';
      this.grid._scrollingContainer.style.touchAction =
        this.state.isExpanded && !panning ? 'auto' : 'none';
    }
  }

  updateDOMTransformStyle() {
    this.solvesSheet.style.transform = this.getTransformStyle();
  }

  renderCell = ({ item }: { item: Solve }) => {
    const handleItemClick = () => {
      this.props.onCellClicked(item);
    };
    return (
      <Button className="cell" ripple={true} onClick={handleItemClick}>
        {formatTime(item.time)}
      </Button>
    );
  };

  render() {
    const { solves } = this.props;

    const style = {
      transform: this.getTransformStyle()
    };

    return (
      <div
        className="solves-sheet"
        ref={this.solvesSheetRef}
        onTouchMove={this.handleTouchMove}
        onTouchEnd={this.handleTouchEnd}
        onAnimationEnd={this.handleAnimationEnd}
        style={style}
      >
        <IconButton className="caret-icon" onClick={this.handleCaretClick}>
          {this.state.isExpanded ? <CaretDown /> : <CaretUp />}
        </IconButton>
        <div className="container">
          <div className="solves-background">
            <VirtualizedItemGrid
              innerRef={this.gridRef}
              minItemWidth={64}
              items={solves}
              renderItem={this.renderCell}
              className="solves-grid"
              onScroll={this.handleScroll}
            />
          </div>
        </div>
      </div>
    );
  }
}

export default SolvesSheet;
