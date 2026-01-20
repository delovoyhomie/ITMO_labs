const { useEffect, useMemo, useRef, useState } = React;
const { Provider, useDispatch, useSelector } = ReactRedux;
const { applyMiddleware, combineReducers, createStore } = Redux;
const thunk = ReduxThunk.default || ReduxThunk.thunk || ReduxThunk;

const X_OPTIONS = [-2, -1.5, -1, -0.5, 0, 0.5, 1, 1.5, 2];
const R_OPTIONS = [-2, -1.5, -1, -0.5, 0, 0.5, 1, 1.5, 2];
const X_MIN = Math.min(...X_OPTIONS);
const X_MAX = Math.max(...X_OPTIONS);
const Y_MIN = -3;
const Y_MAX = 5;

const AUTH_REQUEST = 'AUTH_REQUEST';
const AUTH_SUCCESS = 'AUTH_SUCCESS';
const AUTH_FAILURE = 'AUTH_FAILURE';
const AUTH_LOGOUT = 'AUTH_LOGOUT';

const POINTS_REQUEST = 'POINTS_REQUEST';
const POINTS_SUCCESS = 'POINTS_SUCCESS';
const POINTS_FAILURE = 'POINTS_FAILURE';
const POINT_ADD = 'POINT_ADD';
const POINT_CLEAR = 'POINT_CLEAR';

const initialAuthState = {
    user: null,
    loading: false,
    error: null
};

const initialPointsState = {
    items: [],
    loading: false,
    error: null
};

function authReducer(state = initialAuthState, action) {
    switch (action.type) {
        case AUTH_REQUEST:
            return { ...state, loading: true, error: null };
        case AUTH_SUCCESS:
            return { ...state, loading: false, user: action.payload, error: null };
        case AUTH_FAILURE:
            return { ...state, loading: false, user: null, error: action.payload };
        case AUTH_LOGOUT:
            return { ...state, loading: false, user: null, error: null };
        default:
            return state;
    }
}

function pointsReducer(state = initialPointsState, action) {
    switch (action.type) {
        case POINTS_REQUEST:
            return { ...state, loading: true, error: null };
        case POINTS_SUCCESS:
            return { ...state, loading: false, items: action.payload, error: null };
        case POINTS_FAILURE:
            return { ...state, loading: false, error: action.payload };
        case POINT_ADD:
            return { ...state, items: [...state.items, action.payload], error: null };
        case POINT_CLEAR:
            return { ...state, items: [], error: null };
        default:
            return state;
    }
}

const store = createStore(
    combineReducers({ auth: authReducer, points: pointsReducer }),
    applyMiddleware(thunk)
);

async function apiRequest(path, options = {}) {
    const config = {
        headers: {
            'Content-Type': 'application/json',
            ...(options.headers || {})
        },
        credentials: 'include',
        ...options
    };

    if (config.body && typeof config.body !== 'string') {
        config.body = JSON.stringify(config.body);
    }

    const response = await fetch(path, config);
    if (response.status === 204) {
        return null;
    }

    const contentType = response.headers.get('content-type') || '';
    const data = contentType.includes('application/json') ? await response.json() : null;

    if (!response.ok) {
        const message = data && data.message ? data.message : 'Request failed';
        throw new Error(message);
    }

    return data;
}

const login = (username, password) => async (dispatch) => {
    dispatch({ type: AUTH_REQUEST });
    try {
        const data = await apiRequest('/api/auth/login', {
            method: 'POST',
            body: { username, password }
        });
        dispatch({ type: AUTH_SUCCESS, payload: data });
        dispatch(fetchPoints());
    } catch (error) {
        dispatch({ type: AUTH_FAILURE, payload: error.message });
    }
};

const restoreSession = () => async (dispatch) => {
    dispatch({ type: AUTH_REQUEST });
    try {
        const data = await apiRequest('/api/auth/me');
        dispatch({ type: AUTH_SUCCESS, payload: data });
        dispatch(fetchPoints());
    } catch (error) {
        dispatch({ type: AUTH_LOGOUT });
    }
};

const logout = () => async (dispatch) => {
    try {
        await apiRequest('/api/auth/logout', { method: 'POST' });
    } finally {
        dispatch({ type: AUTH_LOGOUT });
        dispatch({ type: POINT_CLEAR });
    }
};

const fetchPoints = () => async (dispatch) => {
    dispatch({ type: POINTS_REQUEST });
    try {
        const data = await apiRequest('/api/points');
        dispatch({ type: POINTS_SUCCESS, payload: data });
    } catch (error) {
        dispatch({ type: POINTS_FAILURE, payload: error.message });
    }
};

const addPoint = (x, y, r) => async (dispatch) => {
    try {
        const data = await apiRequest('/api/points', {
            method: 'POST',
            body: { x, y, r }
        });
        dispatch({ type: POINT_ADD, payload: data });
    } catch (error) {
        dispatch({ type: POINTS_FAILURE, payload: error.message });
        throw error;
    }
};

const clearPoints = () => async (dispatch) => {
    try {
        await apiRequest('/api/points', { method: 'DELETE' });
        dispatch({ type: POINT_CLEAR });
        dispatch(fetchPoints());
    } catch (error) {
        dispatch({ type: POINTS_FAILURE, payload: error.message });
    }
};

function formatNumber(value) {
    const rounded = Math.round(value * 1000) / 1000;
    return rounded.toString();
}

function formatTimestamp(value) {
    if (!value) {
        return '-';
    }
    const date = new Date(value);
    return date.toLocaleString('ru-RU');
}

function LoginPage() {
    const dispatch = useDispatch();
    const auth = useSelector((state) => state.auth);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    const handleSubmit = (event) => {
        event.preventDefault();
        dispatch(login(username.trim(), password));
    };

    return (
        <div className="page">
            <div className="shell glass">
                <header className="header-strip">
                    <div className="brand">
                        <span className="brand__dot"></span>
                        <span className="brand__title">Якименко Владислав Игоревич, P3213</span>
                    </div>
                    <span className="brand__title">Вариант 1746</span>
                </header>
                <div className="hero-grid">
                    <div className="card">
                        <h1 className="title">Лабораторная работа №4</h1>
                        <p className="subtitle">
                            React + Redux интерфейс для проверки попадания точки в область.
                            Авторизуйтесь, чтобы работать с координатами и историей проверок.
                        </p>
                        <div className="footer-note">Backend: Spring · DB: HSQLDB</div>
                    </div>
                    <div className="card">
                        <h2 className="title">Вход в систему</h2>
                        <p className="subtitle">Используйте учетную запись лаборатории.</p>
                        <form className="login-form" onSubmit={handleSubmit}>
                            <div className="field">
                                <label htmlFor="login">Логин</label>
                                <input
                                    id="login"
                                    className="text-input"
                                    type="text"
                                    value={username}
                                    onChange={(event) => setUsername(event.target.value)}
                                    autoComplete="username"
                                    required
                                />
                            </div>
                            <div className="field">
                                <label htmlFor="password">Пароль</label>
                                <input
                                    id="password"
                                    className="text-input"
                                    type="password"
                                    value={password}
                                    onChange={(event) => setPassword(event.target.value)}
                                    autoComplete="current-password"
                                    required
                                />
                            </div>
                            {auth.error && <div className="message error">{auth.error}</div>}
                            <button className="button block" type="submit" disabled={auth.loading}>
                                {auth.loading ? 'Проверяем...' : 'Войти'}
                            </button>
                            <div className="message warning">Дефолтный логин: student / student</div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}

function MainPage() {
    const dispatch = useDispatch();
    const auth = useSelector((state) => state.auth);
    const pointsState = useSelector((state) => state.points);

    const [x, setX] = useState(X_OPTIONS[0].toString());
    const [y, setY] = useState('');
    const [r, setR] = useState('1');
    const [localError, setLocalError] = useState('');
    const [graphNote, setGraphNote] = useState('');

    const parsedR = useMemo(() => parseFloat(r), [r]);

    const validateForm = () => {
        const parsedX = parseFloat(x);
        const parsedY = parseFloat(y.replace(',', '.'));
        const parsedRValue = parseFloat(r);

        if (!X_OPTIONS.includes(parsedX)) {
            return 'X должен быть выбран из списка';
        }
        if (Number.isNaN(parsedY) || parsedY < Y_MIN || parsedY > Y_MAX) {
            return 'Y должен быть числом от -3 до 5';
        }
        if (!R_OPTIONS.includes(parsedRValue)) {
            return 'R должен быть выбран из списка';
        }
        if (parsedRValue <= 0) {
            return 'R должен быть больше 0';
        }
        return '';
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        const error = validateForm();
        if (error) {
            setLocalError(error);
            return;
        }
        setLocalError('');
        try {
            const normalizedY = y.replace(',', '.');
            await dispatch(addPoint(x, normalizedY, r));
            setGraphNote('');
        } catch (err) {
            setGraphNote('');
        }
    };

    const handleGraphSubmit = async (coords) => {
        const parsedRValue = parseFloat(r);
        if (!R_OPTIONS.includes(parsedRValue) || parsedRValue <= 0) {
            setLocalError('Чтобы использовать график, выберите корректный R (> 0)');
            return;
        }
        setLocalError('');
        if (coords.x < X_MIN || coords.x > X_MAX || coords.y < Y_MIN || coords.y > Y_MAX) {
            setGraphNote('');
            return;
        }
        try {
            await dispatch(addPoint(coords.x.toString(), coords.y.toString(), parsedRValue.toString()));
            setGraphNote(`Отправлено с графика: x=${formatNumber(coords.x)}, y=${formatNumber(coords.y)}`);
        } catch (err) {
            setGraphNote('');
        }
    };

    return (
        <div className="page">
            <div className="workspace glass">
                <header className="header-strip">
                    <div className="brand">
                        <span className="brand__dot"></span>
                        <span className="brand__title">{auth.user?.username}</span>
                        <span className="brand__title">R: {r}</span>
                    </div>
                    <button className="button secondary" type="button" onClick={() => dispatch(logout())}>
                        Выйти
                    </button>
                </header>
                <div className="workspace-grid">
                    <section className="card form-stack">
                        <div>
                            <h2 className="title">Задайте координаты</h2>
                            <p className="subtitle">X — из списка, Y — текстовое поле, R — из списка.</p>
                        </div>
                        <form className="form-stack" onSubmit={handleSubmit}>
                            <div className="field">
                                <label htmlFor="x">X</label>
                                <select
                                    id="x"
                                    className="select-input"
                                    value={x}
                                    onChange={(event) => setX(event.target.value)}
                                >
                                    {X_OPTIONS.map((value) => (
                                        <option key={value} value={value}>{value}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="field">
                                <label htmlFor="y">Y (-3 ... 5)</label>
                                <input
                                    id="y"
                                    className="text-input"
                                    type="text"
                                    value={y}
                                    onChange={(event) => setY(event.target.value)}
                                    placeholder="Например, 1.7"
                                />
                            </div>
                            <div className="field">
                                <label htmlFor="r">R</label>
                                <select
                                    id="r"
                                    className="select-input"
                                    value={r}
                                    onChange={(event) => setR(event.target.value)}
                                >
                                    {R_OPTIONS.map((value) => (
                                        <option key={value} value={value}>{value}</option>
                                    ))}
                                </select>
                            </div>
                            {localError && <div className="message error">{localError}</div>}
                            {pointsState.error && <div className="message error">{pointsState.error}</div>}
                            <div className="form-actions">
                                <button className="button" type="submit">Проверить</button>
                                <button className="button secondary" type="button" onClick={() => dispatch(clearPoints())}>
                                    Очистить историю
                                </button>
                            </div>
                        </form>
                    </section>

                    <section className="card">
                        <div className="graph-panel">
                            <div className="graph-box">
                                <p className="graph-note">Кликните по графику, чтобы отправить точку</p>
                                <div className="graph-wrapper">
                                    <Graph
                                        r={parsedR}
                                        points={pointsState.items}
                                        onPointSubmit={handleGraphSubmit}
                                    />
                                </div>
                                {graphNote && <div className="message warning">{graphNote}</div>}
                            </div>
                            <div className="results">
                                <p className="graph-note">История проверок</p>
                                <div className="table-scroll">
                                    <table className="result-table">
                                        <thead>
                                        <tr>
                                            <th>X</th>
                                            <th>Y</th>
                                            <th>R</th>
                                            <th>Входит?</th>
                                            <th>Время</th>
                                            <th>Выполнение</th>
                                        </tr>
                                        </thead>
                                        <tbody>
                                        {pointsState.items.length === 0 && (
                                            <tr>
                                                <td colSpan="6">Пока нет результатов</td>
                                            </tr>
                                        )}
                                        {pointsState.items.map((point) => (
                                            <tr key={point.id}>
                                                <td>{formatNumber(Number(point.x))}</td>
                                                <td>{formatNumber(Number(point.y))}</td>
                                                <td>{formatNumber(Number(point.r))}</td>
                                                <td className={point.insideArea ? 'positive' : 'negative'}>
                                                    {point.insideArea ? 'Да' : 'Нет'}
                                                </td>
                                                <td>{formatTimestamp(point.checkedAt)}</td>
                                                <td>{point.executionTime} нс</td>
                                            </tr>
                                        ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}

function Graph({ r, points, onPointSubmit }) {
    const svgRef = useRef(null);
    const [hover, setHover] = useState(null);

    const safeR = Number.isFinite(r) && r > 0 ? r : 1;
    const CENTER = 150;
    const SCALE = 70;

    const shapeSize = safeR * SCALE;
    const halfSize = shapeSize / 2;
    const arcRadius = halfSize;

    const ticks = [
        { axis: 'x', factor: 1 },
        { axis: 'x', factor: 0.5 },
        { axis: 'x', factor: -1 },
        { axis: 'x', factor: -0.5 },
        { axis: 'y', factor: 1 },
        { axis: 'y', factor: 0.5 },
        { axis: 'y', factor: -1 },
        { axis: 'y', factor: -0.5 }
    ];

    const getCoords = (event) => {
        if (!svgRef.current) {
            return null;
        }
        const rect = svgRef.current.getBoundingClientRect();
        const scaleX = rect.width / 300;
        const scaleY = rect.height / 300;
        const source = event.touches && event.touches[0] ? event.touches[0] : event;
        const localX = (source.clientX - rect.left) / scaleX;
        const localY = (source.clientY - rect.top) / scaleY;
        const coordX = (localX - CENTER) / SCALE;
        const coordY = (CENTER - localY) / SCALE;
        return { x: coordX, y: coordY };
    };

    const handleMove = (event) => {
        const coords = getCoords(event);
        if (!coords) {
            return;
        }
        setHover(coords);
    };

    const handleLeave = () => setHover(null);

    const handleClick = (event) => {
        const coords = getCoords(event);
        if (!coords) {
            return;
        }
        const rounded = {
            x: Math.round(coords.x * 1000) / 1000,
            y: Math.round(coords.y * 1000) / 1000
        };
        onPointSubmit(rounded);
    };

    return (
        <svg
            ref={svgRef}
            className="graph-svg"
            viewBox="0 0 300 300"
            onMouseMove={handleMove}
            onMouseLeave={handleLeave}
            onClick={handleClick}
            onTouchStart={handleClick}
        >
            <defs>
                <linearGradient id="shapeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#5ae8c2" stopOpacity="0.62" />
                    <stop offset="100%" stopColor="#2b90ff" stopOpacity="0.48" />
                </linearGradient>
                <linearGradient id="axisGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#e8eef7" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#9ab0cd" stopOpacity="0.8" />
                </linearGradient>
                <radialGradient id="backgroundGlow" cx="50%" cy="35%" r="70%">
                    <stop offset="0%" stopColor="#1c2a45" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#0e1627" stopOpacity="0.6" />
                </radialGradient>
                <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="10" stdDeviation="12" floodColor="#0b0f1c" floodOpacity="0.5" />
                </filter>
            </defs>

            <rect x="6" y="6" width="288" height="288" rx="18" ry="18" fill="url(#backgroundGlow)" stroke="#1f2c41" strokeWidth="1.5" filter="url(#softShadow)" />

            <rect
                x={CENTER - shapeSize}
                y={CENTER - shapeSize}
                width={shapeSize}
                height={shapeSize}
                fill="url(#shapeGradient)"
                fillOpacity="0.7"
                pointerEvents="none"
            />

            <polygon
                fill="url(#shapeGradient)"
                fillOpacity="0.7"
                points={`${CENTER},${CENTER} ${CENTER + halfSize},${CENTER} ${CENTER},${CENTER - halfSize}`}
                pointerEvents="none"
            />

            <path
                d={`M ${CENTER} ${CENTER} L ${CENTER + arcRadius} ${CENTER} A ${arcRadius} ${arcRadius} 0 0 1 ${CENTER} ${CENTER + arcRadius} Z`}
                fill="url(#shapeGradient)"
                fillOpacity="0.7"
                pointerEvents="none"
            />

            <line stroke="url(#axisGradient)" x1="10" x2="290" y1="150" y2="150" strokeWidth="3" strokeLinecap="round" strokeDasharray="2 2" pointerEvents="none" />
            <line stroke="url(#axisGradient)" x1="150" x2="150" y1="10" y2="290" strokeWidth="3" strokeLinecap="round" strokeDasharray="2 2" pointerEvents="none" />
            <polygon fill="#e8eef7" points="150,0 142,14 158,14" pointerEvents="none" />
            <polygon fill="#e8eef7" points="300,150 286,158 286,142" pointerEvents="none" />

            {ticks.map((tick) => {
                const offset = tick.factor * safeR * SCALE;
                const labelValue = formatNumber(tick.factor * safeR);
                if (tick.axis === 'x') {
                    const x = CENTER + offset;
                    return (
                        <g key={`x-${tick.factor}`} pointerEvents="none">
                            <line x1={x} x2={x} y1={CENTER - 6} y2={CENTER + 6} stroke="#9ab0cd" strokeWidth="2" />
                            <text x={x - 8} y={CENTER + 20} fontSize="10" fill="#9ab0cd" fontFamily="Manrope, sans-serif">
                                {labelValue}
                            </text>
                        </g>
                    );
                }
                const y = CENTER - offset;
                return (
                    <g key={`y-${tick.factor}`} pointerEvents="none">
                        <line y1={y} y2={y} x1={CENTER - 6} x2={CENTER + 6} stroke="#9ab0cd" strokeWidth="2" />
                        <text x={CENTER + 10} y={y + 4} fontSize="10" fill="#9ab0cd" fontFamily="Manrope, sans-serif">
                            {labelValue}
                        </text>
                    </g>
                );
            })}

            {points.map((point) => (
                <circle
                    key={`point-${point.id}`}
                    cx={CENTER + Number(point.x) * SCALE}
                    cy={CENTER - Number(point.y) * SCALE}
                    r="5"
                    fill={point.insideArea ? '#5ae8c2' : '#ff6b6b'}
                    pointerEvents="none"
                />
            ))}

            {hover && (
                <circle
                    cx={CENTER + hover.x * SCALE}
                    cy={CENTER - hover.y * SCALE}
                    r="12"
                    stroke="#b7c9d9"
                    strokeWidth="6"
                    fill="none"
                    opacity="0.9"
                    pointerEvents="none"
                />
            )}
        </svg>
    );
}

function App() {
    const dispatch = useDispatch();
    const auth = useSelector((state) => state.auth);

    useEffect(() => {
        dispatch(restoreSession());
    }, [dispatch]);

    if (!auth.user) {
        return <LoginPage />;
    }

    return <MainPage />;
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
    <Provider store={store}>
        <div className="app">
            <App />
        </div>
    </Provider>
);
