import { Box, Button, Divider, Grid, Paper, Stack } from '@mui/material';
import React, { useRef, useState, useEffect } from 'react';
import { useMediaQuery } from 'react-responsive';
import { Link, useNavigate } from 'react-router-dom';
import { ModelData, modelDir } from './modelData';



export interface IProductGridProps {
    key: any,
    modelData: ModelData,
}


function ProductGrid(props: IProductGridProps) {

    const navigate = useNavigate();
    
    const defaultParagraph = {
        margin: 0,
    }
    
    const isMobile = useMediaQuery({ maxWidth: 767 })

    function goToProductPage() {
        navigate(
            `/product`,
            {
                state: {
                    modelData: props.modelData,
                }
            }
        )

    }

    return(
        <Grid item key={props.key} xs={12} sm={6} md={4} sx={{minWidth: '300px', padding: '10px'}}>
            <Paper 
                elevation={3} 
                sx={{
                    width: isMobile ? '300px': '400px',  
                    height: isMobile ? '440px': '550px', 
                    margin: '10px'
                }}
            >
                <Box sx={{height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
                    <Box sx={{
                        width: isMobile ? '280px': '380px', 
                        height: isMobile ? '280px': '380px', 
                        marginTop: '10px', 
                        marginBottom: '10px'
                    }}>
                        <a onClick={goToProductPage}> 
                            <img style={{width: '100%', height: '100%', cursor: 'pointer'}} alt='gongzai' src={modelDir + '/' + props.modelData.name + '_phone/screenshots/1.png'} />
                        </a>
                    </Box>
                    <Divider flexItem />
                    <Box sx={{width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '5px'}}>
                        <p style={{...defaultParagraph, ...{fontSize: '25px'}}}>{props.modelData.data.name}</p>
                        <p style={{...defaultParagraph, ...{color: 'red', fontSize: '17px'}}}>
                            <b>NT$ {props.modelData.data.price}</b>
                        </p>
                        <br />
                        <Button variant='contained' sx={{backgroundColor: 'black'}}>Add to cart</Button>
                    </Box>
                </Box>
            </Paper>
        </Grid>
    );
}

export default ProductGrid;
