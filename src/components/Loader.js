import React from "react";
import { Spinner } from "react-bootstrap";

const Loader = ({ size = "border", style = {}, className = "" }) => (
  <div
    className={`d-flex justify-content-center align-items-center ${className}`}
    style={{ minHeight: "85vh", ...style }}
  >
    <Spinner animation={size} />
  </div>
);

export default Loader;
