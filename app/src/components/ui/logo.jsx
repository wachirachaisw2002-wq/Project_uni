import React from 'react';

const logoSrc = "/logos.png";

const Logo = ({ className, width = 150, height = "auto", ...props }) => {
  return (
    <img
      src={logoSrc}
      className={className}
      style={{ width: width, height: height }}
      {...props}
    />
  );
};

export default Logo;