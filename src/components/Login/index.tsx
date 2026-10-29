import { Button, Container, Typography, Stack, Box, Input } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { setCurrentUser } from '../../data/auth';

const Login = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorRprt, setErrorRprt] = useState('');

  useEffect(() => {
    if (!errorRprt) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setErrorRprt('');
    }, 3000);

    return () => window.clearTimeout(timeoutId);
  }, [errorRprt]);

  const loginHandler = (enteredUsername: string, enteredPassword: string) => {
    const normalizedUsername = enteredUsername.trim();
    if (!normalizedUsername || !enteredPassword) {
      setErrorRprt('Enter a username and password');
      return;
    }

    const normalizedUsernameLowerCase = normalizedUsername.toLowerCase();
    const isAdminLogin = normalizedUsernameLowerCase === 'admin' && enteredPassword === 'password';
    const isViewerLogin = (
      ['user', 'student'].includes(normalizedUsernameLowerCase)
      && enteredPassword === 'password'
    );

    if (!isAdminLogin && !isViewerLogin) {
      setErrorRprt('Invalid username or password');
      return;
    }

    try {
      setCurrentUser({
        username: normalizedUsername,
        role: isAdminLogin ? 'admin' : 'user',
      });
      navigate('/home');
    } catch (error) {
      setErrorRprt(error instanceof Error ? error.message : 'Unable to start your session');
    }
  };

  return (
    <Container maxWidth="sm">
        <Box>
            <Typography variant="h4" gutterBottom align="center" sx={{ mt: 4 }}>
                Login
            </Typography>
            <Stack 
                spacing={2} 
                direction="row" 
                sx={{ 
                    mt: 2, mb: 2, bgcolor: 'background.paper', p: 2, borderRadius: 1, justifyContent: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                {errorRprt && (
                    <Typography color="error" variant="body2">
                        {errorRprt}
                    </Typography>
                )}
                <Input placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
                <Input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                <Button variant="contained" color="primary" endIcon={<SendIcon />} onClick={() => loginHandler(username, password)}>
                    Login
                </Button>
                <Typography variant="caption" color="text.secondary">
                  Demo accounts: admin / password (editor), user / password or student / password (viewer).
                </Typography>
            </Stack>

        </Box>
    </Container>
    
  )
}

export default Login