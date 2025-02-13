import React from "react";

type ButtonProps = {
  label: string;
};

const Button: React.FC<ButtonProps> = ({ label }) => {
  return <button className="btn btn-primary pt-8">{label}</button>;
};

export default Button;
