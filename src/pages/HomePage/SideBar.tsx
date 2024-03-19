
import { Box, Button, Checkbox, FormControlLabel, FormGroup, Stack, TextField } from '@mui/material';
import React, { useRef, useState, useEffect } from 'react';

function SideBar() {
    return(
        <Box sx={{
            // backgroundColor: 'red', 
            width: '20%', 
            height: '100%',
            p: '20px'
        }}>
            <Stack spacing={1}>
                <p style={{fontSize: '30px', margin: 0}}>Brand</p>
                <FormGroup sx={{paddingRight: '20%', paddingLeft: '20px'}}>
                    <FormControlLabel control={<Checkbox defaultChecked sx={{paddingLeft: '10px', color: 'black', '&.Mui-checked': { color: 'black', },}}/>} label="One Piece" />
                    <FormControlLabel control={<Checkbox defaultChecked sx={{paddingLeft: '10px', color: 'black', '&.Mui-checked': { color: 'black', },}}/>} label="Demon Slayer" />
                    <FormControlLabel control={<Checkbox defaultChecked sx={{paddingLeft: '10px', color: 'black', '&.Mui-checked': { color: 'black', },}}/>} label="Dragon Ball" />
                </FormGroup>
                <br />
            </Stack>
            <Stack spacing={3}>
                <p style={{fontSize: '30px', margin: 0}}>Price</p>
                <Stack direction="row" spacing={3} sx={{paddingRight: '20%', paddingLeft: '10px'}}>
                    <TextField id="outlined-basic" label="Lowest" variant="outlined" />
                    <TextField id="outlined-basic" label="Highest" variant="outlined" />
                </Stack>
                <Button variant="contained" sx={{width:'80%', height: '30px', backgroundColor: 'black'}}>Apply</Button>
            </Stack>
        </Box>
    );
}

export default SideBar;