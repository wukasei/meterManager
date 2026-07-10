import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  IconButton,
  CircularProgress,
} from '@mui/material';
import { Close } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { getDialogMessage } from '../../utils/getDialogMessage';
import { UA } from '../../utils/uaDictionary';
import { SIZES } from '../../constants';

const ConfirmDialog = ({ open, onClose, onConfirm, action, dependencies, isLoading, entity }) => {
  const theme = useTheme();

  return (
    <Dialog open={open} onClose={onClose} aria-labelledby="confirm-dialog-title">
      <DialogTitle id="confirm-dialog-title" sx={{ ...theme.mixins.dialogTitle }}>
        {action === 'delete' ? UA.confirm_delete_title : UA.confirm_deactivate_title}
        <IconButton onClick={onClose} disabled={isLoading} size="small">
          <Close />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Typography>{getDialogMessage(action, dependencies, entity)}</Typography>
      </DialogContent>
      <DialogActions sx={theme.mixins.dialogActions}>
        <Button onClick={onClose} disabled={isLoading}>
          {UA.common_cancel}
        </Button>
        <Button onClick={onConfirm} color="error" variant="contained" disabled={isLoading}>
          {isLoading ? (
            <CircularProgress size={SIZES.circularProgress.medium} />
          ) : action === 'delete' ? (
            UA.confirm_delete_action
          ) : (
            UA.confirm_deactivate_action
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmDialog;
