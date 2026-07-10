import React from 'react';
import { TextField, InputAdornment } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';

interface SearchFieldProps {
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  sx?: object;
}

const SearchField: React.FC<SearchFieldProps> = ({ value, onChange, sx }) => {
  return (
    <TextField
      label="Пошук"
      size="small"
      value={value}
      onChange={onChange}
      sx={sx}
      fullWidth
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <SearchIcon color="action" />
          </InputAdornment>
        ),
      }}
    />
  );
};

export default SearchField;
