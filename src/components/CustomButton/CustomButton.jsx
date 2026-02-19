import React from "react";
import "./custom-button.css";
import { Button } from "antd";
import { Link } from "react-router-dom";

export const CustomButton = ({
  url,
  onClick,
  icon,
  label,
  variant = "default",
  external = false,
}) => {

  if (url && onClick) {
    console.warn("CustomButton: No puedes usar url y onClick al mismo tiempo.");
  }

  const wrapperClass =
    variant === "primary" ? "action_primary" : "action_wrap";

  const buttonClass =
    variant === "primary" ? "primary_button" : "action_button";

  const buttonElement = (
    <Button
      icon={icon}
      className={buttonClass}
      onClick={!url ? onClick : undefined}
    >
      {label}
    </Button>
  );

  return (
    <div className={wrapperClass}>
      {url ? (
        external ? (
          <a href={url} target="_blank" rel="noreferrer">
            {buttonElement}
          </a>
        ) : (
          <Link to={url}>
            {buttonElement}
          </Link>
        )
      ) : (
        buttonElement
      )}
    </div>
  );
};
