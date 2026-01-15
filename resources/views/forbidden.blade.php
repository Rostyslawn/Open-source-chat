<!doctype html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport"
          content="width=device-width, user-scalable=no, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="ie=edge">
    <title>403 Forbidden</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }

        .container {
            background: white;
            border-radius: 16px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            max-width: 500px;
            width: 100%;
            padding: 40px;
            text-align: center;
            animation: slideIn 0.5s ease-out;
        }

        @keyframes slideIn {
            from {
                opacity: 0;
                transform: translateY(-30px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .error-code {
            font-size: 80px;
            font-weight: 700;
            color: #667eea;
            margin-bottom: 10px;
            text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.1);
        }

        .error-title {
            font-size: 28px;
            font-weight: 600;
            color: #2d3748;
            margin-bottom: 20px;
        }

        .error-message {
            background: #fee;
            border-left: 4px solid #dc3545;
            padding: 15px 20px;
            border-radius: 8px;
            color: #721c24;
            font-size: 16px;
            line-height: 1.5;
            margin-top: 20px;
            text-align: left;
            animation: shake 0.5s;
        }

        @keyframes shake {
            0%, 100% {
                transform: translateX(0);
            }
            25% {
                transform: translateX(-10px);
            }
            75% {
                transform: translateX(10px);
            }
        }

        .error-message strong {
            display: block;
            font-weight: 600;
            margin-bottom: 5px;
            color: #dc3545;
        }

        .back-button {
            display: inline-block;
            margin-top: 30px;
            padding: 12px 30px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 500;
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
        }

        .back-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
        }

        .icon {
            font-size: 60px;
            margin-bottom: 20px;
        }
    </style>
</head>
<body>
<div class="container">
    <div class="icon">🚫</div>
    <div class="error-code">403</div>
    <div class="error-title">Forbidden</div>
    @if(session('error'))
        <div class="error-message">
            <strong>Error:</strong>
            {{ session('error') }}
        </div>
    @endif
    <a href="{{ route('index') }}" class="back-button">
        Go back
    </a>
</div>
</body>
</html>
