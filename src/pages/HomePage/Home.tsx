import { sizing } from "@mui/system";
import { makeStyles, withStyles } from "tss-react/mui";
import React, { useRef, useState, useEffect } from 'react';
import { green } from '@mui/material/colors';
import { Link, useNavigate } from 'react-router-dom';
import ProductColumn from './ProductColumn';
import { Box, Button, ButtonBase, Card, CardContent, Container, Divider, Stack, Typography, ToggleButton, ToggleButtonGroup, Grid, Paper, TextField, FormGroup, FormControlLabel, Checkbox } from '@mui/material';
import GridViewIcon from '@mui/icons-material/GridView';
import ViewListIcon from '@mui/icons-material/ViewList';
import { useMediaQuery } from 'react-responsive'
import ProductGrid from "./ProductGrid";
import SideBar from "./SideBar";
import { ModelData } from "./modelData";

export interface IHomeProps {
//   modelName: string,
//   setModelName: React.Dispatch<React.SetStateAction<string>>
}

function Home(props: IHomeProps) {

    const navigate = useNavigate();

    const [screenSize, getDimension] = useState({
        dynamicWidth: window.innerWidth,
        dynamicHeight: window.innerHeight
    });
    const setDimension = () => {
        getDimension({
            dynamicWidth: window.innerWidth,
            dynamicHeight: window.innerHeight
        })
    }

    const [alignment, setAlignment] = React.useState<string | null>(localStorage.getItem("alignment") ? localStorage.getItem("alignment") : 'left');

    const handleChange = (
        event: React.MouseEvent<HTMLElement>,
        newAlignment: string | null,
    ) => {
        setAlignment(newAlignment);
        localStorage.setItem("alignment", newAlignment as string);
    };

    useEffect(() => {
        window.addEventListener('resize', setDimension);
        
        
        return(() => {
            window.removeEventListener('resize', setDimension);
        })
    }, [screenSize])

    const defaultParagraph = {
        margin: 0,
    }

    const isMobile = useMediaQuery({ maxWidth: 767 })

    const [modelData, setModelData] = useState<ModelData[]>([]);

    // fetch modelData.json
    useEffect(() => {

        fetch('resources/modelData.json')
            .then((response) => response.json())
            .then((jsonData) => {
                let modelList: ModelData[] = []
                for (let modelName in jsonData) {
                    modelList.push({
                        name: modelName,
                        data: jsonData[modelName],
                    })
                }
                setModelData(modelList)
            })
    }, []);

    return(
        <>
            <Box sx={{
                marginTop: '100px', 
                textAlign: 'center', 
                fontSize: '40px', 
                // backgroundColor: 'red'
            }}>
                <h1>AI Toy eStore</h1>
            </Box>
            
            {
                !isMobile && 
                <Box sx={{width: '100%', display: 'flex', justifyContent: "flex-end"}}>
                    <ToggleButtonGroup
                        value={alignment}
                        exclusive
                        onChange={handleChange}
                        aria-label="text alignment"
                        sx={{margin: '10px'}}
                    >
                        <ToggleButton value="left" aria-label="left aligned">
                            <ViewListIcon />
                        </ToggleButton>
                        <ToggleButton value="center" aria-label="centered">
                            <GridViewIcon />
                        </ToggleButton>
                    </ToggleButtonGroup>
                </Box>
            }
            <Box sx={{
                display: 'flex',
                flexDirection: 'row'
            }}>
                {
                    !isMobile &&
                    <SideBar />
                }
                <Box sx={{
                    //backgroundColor: 'blue', 
                    // width: '80%', 
                    height: '100%',
                    maxWidth: '1300px',
                    paddingRight: '20px',
                    flex: 1
                }}>
                    <Divider />
                    
                    {
                        (isMobile || alignment == 'center')  
                        ? 
                        <Box sx={{display: 'flex', flexDirection: 'row', flex: 1}}>
                            <Grid container spacing={2} sx={{margin: 1}}>
                                {
                                    modelData.map((key, index) => (
                                        <ProductGrid key={index} modelData={key}/>
                                    ))
                                }
                            </Grid>
                            {/* <Box sx={{minWidth: '10px'}}/> */}
                        </Box>
                        : 
                        <>
                            {
                                modelData.map((key, index) => (
                                    <ProductColumn key={index} modelData={key}/>
                                ))
                            }
                        </>
                        
                        


                    }


                </Box>
            </Box>
        </>
    );
}

export default Home;
