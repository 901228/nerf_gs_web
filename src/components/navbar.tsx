import React from "react";
import { Link } from "react-router-dom";
import { Box } from '@mui/material';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';

function NavBar() {

    const textStyle = {
        textDecoration: 'none', 
        color: 'white', 
        marginLeft: '20px', 
        fontSize: '25px'
    };

    return(
        <Box sx={{width: '100%', height: '80px', backgroundColor: 'black', display: 'flex', justifyContent: 'flex-end', alignItems: 'center'}}>
            <Box sx={{marginRight: '50px', display: 'flex', alignItems: 'center'}}>
                <Link style={textStyle} to='/'>Shop</Link>
                <Link style={textStyle} to='/'>Contact</Link>
                <Link style={textStyle} to='/'>
                    <ShoppingCartIcon sx={{fontSize: 32}} />
                </Link>
            </Box>
        </Box>
    );
}

export default NavBar;