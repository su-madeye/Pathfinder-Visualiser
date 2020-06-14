import React, { Component } from "react";
import { withGetScreen } from "react-getscreen";
import Node from "./Node";
import "../css/Grid.css";
import { Dijkstra } from "../algorithms/Dijkstra";
import Card from "react-bootstrap/Card";
import Navbar from "react-bootstrap/Navbar";
import Nav from "react-bootstrap/Nav";
import NavDropdown from "react-bootstrap/NavDropdown";
import Button from "react-bootstrap/Button";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";

// Constants
const ROW_SIZE_DESKTOP = 20,
  COL_SIZE_DESKTOP = 50,
  ROW_SIZE_TABLET = 15,
  COL_SIZE_TABLET = 15,
  ROW_SIZE_MOBILE = 18,
  COL_SIZE_MOBILE = 10,
  START_NODE_COL = 0,
  START_NODE_ROW = 0,
  FINISH_NODE_COL = 1,
  FINISH_NODE_ROW = 1;

class Grid extends Component {
  constructor(props) {
    super(props);
    this.state = {
      grid: [],
      rowSize: 0,
      colSize: 0,
      startNodeCoords: { row: 0, col: 0 },
      finishNodeCoords: { row: 0, col: 0 },
      mouseDown: false,
      screenWidth: null,
      isRunning: false,
      canReset: true,
      algorithmTitle: "Choose an algorithm",
    };
    this.grid = React.createRef();
  }

  componentDidMount() {
    const rowSize = this.props.isMobile()
      ? ROW_SIZE_MOBILE
      : this.props.isTablet()
      ? ROW_SIZE_TABLET
      : ROW_SIZE_DESKTOP;
    const colSize = this.props.isMobile()
      ? COL_SIZE_MOBILE
      : this.props.isTablet()
      ? COL_SIZE_TABLET
      : COL_SIZE_DESKTOP;
    this.createInitialGrid(rowSize, colSize, true);
    this.setState({
      rowSize,
      colSize,
    });
  }

  /**
   * This method uses Dijkstra's Algorithm on the grid and shows the process visually.
   */
  handleVisualiseDijkstra = () => {
    this.setState(
      {
        isRunning: true,
        canReset: false,
      },
      () => {
        const { grid, startNodeCoords, finishNodeCoords } = this.state;
        const startNode = grid[startNodeCoords.row][startNodeCoords.col];
        const finishNode = grid[finishNodeCoords.row][finishNodeCoords.col];
        const visitedNodes = Dijkstra(startNode, finishNode, grid); // returns an array of visited nodes with the shortest path
        this.showAnimation(visitedNodes, finishNode);
      }
    );
  };

  /**
   * This method actually handles the animation of Dijkstra by editing the classNames of the nodes that were visited.
   * visitedNodes - array of nodes that were visited, retrieved from Dijkstra's Algorithm
   * finishNode - singular node object that marks the finish
   */
  showAnimation = (visitedNodes, finishNode) => {
    for (let i = 0; i <= visitedNodes.length; i++) {
      // we have completed the loop, now we animate the shortest path
      if (i === visitedNodes.length) {
        setTimeout(() => {
          this.getShortestPath(finishNode);
        }, 10 * i);
        return;
      }

      // loop through all the visited nodes
      setTimeout(() => {
        const { row, col } = visitedNodes[i];
        // get the node from the HTML dom with the ID
        document
          .getElementById(`row-${row}-col-${col}`)
          .classList.add("node-visited");
      }, 10 * i);
    }
  };

  /**
   * This method finds the shortest path by using the node object's LastVisited property.
   * It begins with the finishNode and backtracks all the way to the startNode. It creates an array from all
   * the nodes from the finishNode to the startNode, then reverses that array.
   * finishNode - singular node object that marks the finish
   */
  getShortestPath = (finishNode) => {
    let shortestPathInOrder = [];
    if (finishNode.isVisited === false) {
      // if finishNode is blocked by walls
      this.setState({ canReset: true });
      return;
    }
    shortestPathInOrder.push(finishNode); // finishNode is first
    let currentNode = finishNode;

    // Iterate through all the nodes that were visited last until we have reached the startNode.
    // In other words, backtrack from the finishNode to the startNode.
    while (currentNode.lastNode !== null) {
      shortestPathInOrder.push(currentNode.lastNode);
      currentNode = currentNode.lastNode;
    }
    shortestPathInOrder.reverse(); // reverses the array
    this.animatePath(shortestPathInOrder); // animates the shortest path
  };

  /**
   * Once we have the shortest path, we animate it by using the class "node-path".
   */
  animatePath = (shortestPathInOrder) => {
    for (let i = 0; i <= shortestPathInOrder.length; i++) {
      if (i === shortestPathInOrder.length) {
        setTimeout(() => {
          this.setState({ canReset: true });
        }, 50 * i);
        return;
      }

      setTimeout(() => {
        const { row, col } = shortestPathInOrder[i];
        // get the node from the HTML dom with the ID
        document
          .getElementById(`row-${row}-col-${col}`)
          .classList.add("node-path");
      }, 50 * i);
    }
  };

  /**
   * Removes the node-visited and node-path classes of the grid. Restarts the grid with new state
   */
  resetNodes = () => {
    const columns = this.grid.current.childNodes; // get iterable list of columns
    for (const column of columns) {
      // this returns HTML DOM elements with className = "column"
      for (const node of column.childNodes) {
        // iterate through the nodes in the DOM tree of the column
        node.classList.remove(`node-path`);
        node.classList.remove(`node-visited`);
      }
    }
    const rowSize = this.props.isMobile()
      ? ROW_SIZE_MOBILE
      : this.props.isTablet()
      ? ROW_SIZE_TABLET
      : ROW_SIZE_DESKTOP;
    const colSize = this.props.isMobile()
      ? COL_SIZE_MOBILE
      : this.props.isTablet()
      ? COL_SIZE_TABLET
      : COL_SIZE_DESKTOP;
    this.createInitialGrid(rowSize, colSize, true);
    this.setState({
      rowSize,
      colSize,
      isRunning: false,
    });
  };

  /**
   * Creates the initial grid at startup and whenever the user clicks the reset button.
   * rows - the number of rows of the grid
   * cols - the number of cols of the grid
   * random (Default = false) - whether or not the startNode and finishNode are decided randomly.
   */
  createInitialGrid = (rows, cols, random = false) => {
    let startNode = { row: START_NODE_ROW, col: START_NODE_COL };
    let finishNode = { row: FINISH_NODE_ROW, col: FINISH_NODE_COL };

    // randomises the start and finish nodes
    if (random) {
      // In mobile, we pick either the first 3 rows or the last 3 rows to be the startNode and endNode's positions.
      // e.g. startNode can either be on the top or bottom 3 rows - the endNode gets to be in the other end
      // First, we pick either the top or bottom for startNode
      if (this.props.isMobile()) {
        const choice = Math.floor(Math.random * 1);
        if (choice === 0) {
          startNode = this.randomiseNodePosition(0, 3, 0, cols, startNode); // start will be in the top rows
          finishNode = this.randomiseNodePosition(
            rows - 3,
            rows,
            0,
            cols,
            finishNode
          ); // finish will be in the bottom rows
        } else {
          startNode = this.randomiseNodePosition(
            rows - 3,
            rows,
            0,
            cols,
            startNode
          ); // start will be in the bottom rows
          finishNode = this.randomiseNodePosition(0, 3, 0, cols, finishNode); // finish will be in the far left
        }
      } else {
        // the screen is either desktop or tablet mode
        const choice = Math.floor(Math.random * 1);
        if (choice === 0) {
          startNode = this.randomiseNodePosition(0, rows, 0, 5, startNode); // start will be in the top rows
          finishNode = this.randomiseNodePosition(
            0,
            rows,
            cols - 5,
            cols,
            finishNode
          ); // finish will be in the bottom rows
        } else {
          startNode = this.randomiseNodePosition(
            0,
            rows,
            cols - 5,
            cols,
            startNode
          ); // start will be in the bottom rows
          finishNode = this.randomiseNodePosition(0, rows, 0, 5, finishNode); // finish will be in the top rows
        }
      }
      console.log("Start node: " + startNode.row, startNode.col);
      console.log("End node: " + finishNode.row, finishNode.col);
    }

    // creates the initial grid
    let grid = [];
    for (let i = 0; i < rows; i++) {
      let currentRow = [];
      for (let j = 0; j < cols; j++) {
        currentRow.push(this.createNode(i, j));
      }
      grid.push(currentRow);
    }

    this.setStartAndFinish(grid, startNode, finishNode);

    this.setState({
      grid,
      startNodeCoords: { row: startNode.row, col: startNode.col },
      finishNodeCoords: {
        row: finishNode.row,
        col: finishNode.col,
      },
    });
  };

  /**
   * Randomises the position for a node.
   */
  randomiseNodePosition = (startRow, endRow, startCol, endCol, node) => {
    let { row, col } = node;
    // chooses a random row
    const randomRow = Math.floor(Math.random() * (endRow - startRow)) + 1;
    row = endRow - randomRow;
    // chooses random col
    const randomCol = Math.floor(Math.random() * (endCol - startCol)) + 1;
    col = endCol - randomCol;
    return { row, col };
  };

  /**
   * Edits the isStart and isFinish properties of the start node and finish nodes respectively
   */
  setStartAndFinish = (grid, startNode, finishNode) => {
    grid[startNode.row][startNode.col].isStart = true;
    grid[finishNode.row][finishNode.col].isFinish = true;
  };

  /**
   * Creates lists of walls randomly.
   */
  buildWalls = (grid) => {
    const rows = grid.length,
      cols = grid[0].length;
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        // insert algorithm here
        if (Math.random() * 10 > 9) {
          const currentNode = grid[i][j];
          if (currentNode.isStart === true || currentNode.isFinish === true) {
            continue;
          }
          grid[i][j].isWall = true;
        }
      }
    }
    this.setState({ grid });
  };

  /**
   * Clear all walls from the grid.
   */
  clearWalls = (grid) => {
    const rows = grid.length,
      cols = grid[0].length;
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        let currentNode = grid[i][j];
        if (currentNode.isWall) {
          grid[i][j].isWall = false;
        }
      }
    }
    this.setState({ grid });
  };

  /**
   * Creates a singular node object.
   * row, col - coordinates of the node
   */
  createNode = (row, col) => {
    return {
      row,
      col,
      isStart: false,
      isFinish: false,
      isVisited: false,
      distance: Infinity,
      lastNode: null,
      isWall: false,
    };
  };

  handleMouseUp = (row, col) => {
    const { grid, mouseDown } = this.state;
    if (!mouseDown) {
      return;
    }
    console.log("Mouse is up at", row, col);
    this.setState({ mouseDown: false });
  };

  handleMouseEnter = (row, col) => {
    const { grid, mouseDown } = this.state;
    if (!mouseDown) {
      return;
    }
    console.log("Mouse enters", row, col);
  };

  handleMouseDown = (row, col) => {
    console.log("Mouse is down at", row, col);
    this.setState({ mouseDown: true });
  };

  chooseAlgorithm = (name) => {
    this.setState({ algorithmTitle: name });
  };

  render() {
    const { grid } = this.state;
    return (
      <>
        <Navbar
          sticky="top"
          collapseOnSelect
          expand="lg"
          bg="dark"
          variant="dark"
        >
          <Navbar.Brand href="#home">
            Pathfinder Visualiser by Martin Tiangco
          </Navbar.Brand>
          <Nav className="col-auto">
            <NavDropdown
              title={this.state.algorithmTitle}
              id="collasible-nav-dropdown"
            >
              <NavDropdown.Item
                onClick={() => this.chooseAlgorithm("Breadth-first Search")}
                active={this.state.algorithmTitle === "Breadth-first Search"}
                href="#"
              >
                Breadth-first Search
              </NavDropdown.Item>
              <NavDropdown.Divider />
              <NavDropdown.Item
                onClick={() => this.chooseAlgorithm("Depth-first Search")}
                active={this.state.algorithmTitle === "Depth-first Search"}
                href="#"
              >
                Depth-first Search
              </NavDropdown.Item>
              <NavDropdown.Divider />
              <NavDropdown.Item
                onClick={() => this.chooseAlgorithm("Dijkstra's Algorithm")}
                active={this.state.algorithmTitle === "Dijkstra's Algorithm"}
                href="#"
              >
                Djikstra's Algorithm
              </NavDropdown.Item>
              <NavDropdown.Divider />
              <NavDropdown.Item
                onClick={() => this.chooseAlgorithm("A* Algorithm")}
                active={this.state.algorithmTitle === "A* Algorithm"}
                href="#"
              >
                A* Algorithm
              </NavDropdown.Item>
            </NavDropdown>
          </Nav>
          <Nav className="col-auto">
            <Button
              variant="success"
              onClick={this.handleVisualiseDijkstra}
              disabled={this.state.isRunning}
            >
              Start visualising!
            </Button>
          </Nav>
          <Nav className="col-auto">
            <Button
              variant="info"
              onClick={this.resetNodes}
              disabled={!this.state.canReset}
            >
              Reset
            </Button>
          </Nav>
          <Nav className="col-auto">
            <Button
              variant="info"
              onClick={() => this.buildWalls(grid)}
              disabled={this.state.isRunning}
            >
              Build Walls
            </Button>
          </Nav>
          <Nav className="col-auto">
            <Button
              variant="info"
              onClick={() => this.clearWalls(grid)}
              disabled={this.state.isRunning}
            >
              Clear Walls
            </Button>
          </Nav>
        </Navbar>
        <div className="grid" ref={this.grid}>
          {grid.map((row, rowIdx) => {
            return (
              <div className="column" key={rowIdx}>
                {row.map((node, nodeIdx) => {
                  const {
                    row,
                    col,
                    isStart,
                    isFinish,
                    isWall,
                    isVisited,
                  } = node;
                  const { colSize } = this.state;
                  return (
                    <Node
                      key={rowIdx * colSize + nodeIdx}
                      row={row}
                      col={col}
                      isStart={isStart}
                      isFinish={isFinish}
                      isWall={isWall}
                      isVisited={isVisited}
                      onMouseDown={this.handleMouseDown}
                      onMouseUp={this.handleMouseUp}
                      onMouseEnter={this.handleMouseEnter}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
        {/* Icons made by{" "}
        <a
          href="https://www.flaticon.com/authors/pixel-perfect"
          title="Pixel perfect"
        >
          Pixel perfect
        </a>{" "}
        from{" "}
        <a href="https://www.flaticon.com/" title="Flaticon">
          {" "}
          www.flaticon.com
        </a> */}
      </>
    );
  }
}

export default withGetScreen(Grid);
