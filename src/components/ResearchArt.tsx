export default function ResearchArt({ variant = 0 }: { variant?: number }) {
  return (
    <svg
      viewBox="0 0 280 150"
      className={`research-art art-${variant}`}
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`art-${variant}`} x1="40" y1="20" x2="230" y2="150">
          <stop stopColor="currentColor" stopOpacity=".8" />
          <stop offset="1" stopColor="currentColor" stopOpacity=".16" />
        </linearGradient>
      </defs>
      {variant === 0 ? (
        <g transform="translate(140 75)">
          {[0, 25, 50, 75, 100, 125, 150].map((a) => (
            <ellipse
              key={a}
              rx="75"
              ry="28"
              transform={`rotate(${a})`}
              stroke={`url(#art-${variant})`}
              strokeWidth=".85"
            />
          ))}
          <circle r="75" stroke="currentColor" strokeOpacity=".12" />
          <circle cx="65" cy="-36" r="5" fill="currentColor" />
          <path
            d="M-116 0H-88M88 0H116M0-70V-85M0 70V85"
            stroke="currentColor"
            strokeOpacity=".5"
          />
        </g>
      ) : variant === 1 ? (
        <g>
          {[0, 1, 2, 3].map((layer) => (
            <g key={layer}>
              {[0, 1, 2, 3, 4].map((row) => (
                <g key={row}>
                  {layer < 3 &&
                    [0, 1, 2, 3, 4].map((next) => (
                      <path
                        key={next}
                        d={`M${55 + layer * 56} ${25 + row * 25}L${111 + layer * 56} ${25 + next * 25}`}
                        stroke="currentColor"
                        strokeOpacity=".08"
                      />
                    ))}
                  <circle
                    cx={55 + layer * 56}
                    cy={25 + row * 25}
                    r={row === 2 ? 5 : 3}
                    fill={row === 2 ? "currentColor" : "white"}
                    stroke="currentColor"
                    strokeOpacity=".65"
                  />
                </g>
              ))}
            </g>
          ))}
        </g>
      ) : (
        <g transform="translate(140 76)">
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <path
              key={i}
              d={`M${-75 + i * 11} ${-33 - i * 3}L${i * 11} ${-65 + i * 3}L${75 - i * 5} ${-17 + i * 12}L${-i * 11} ${47 + i * 3}Z`}
              stroke="currentColor"
              strokeOpacity={0.2 + i * 0.1}
            />
          ))}
          <path
            d="M-102 44C-15 94 90 54 104-9"
            stroke="currentColor"
            strokeDasharray="3 5"
          />
          <circle cx="104" cy="-9" r="4" fill="currentColor" />
        </g>
      )}
    </svg>
  );
}
