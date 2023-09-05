import { useContext, useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { ToastContext } from '../Toast/Toast';
import { FF_OPTIC_7, isFF } from '../../utils/feature-flags';


export const DraftGuard = () => {
  const [currentLocation, setCurrentLocation] = useState(null);
  const [nextLocation, setNextLocation] = useState(null);
  const toast = useContext(ToastContext);
  const history = useHistory();

  useEffect(async () => {
    if (nextLocation && isFF(FF_OPTIC_7)) {
      const selected = window.Htx?.annotationStore?.selected;
      const hasChanges = !!selected?.history.undoIdx;
  
      if (!hasChanges || !selected) return;
      const res = await selected?.saveDraftImmediatelyWithResults();
      const status = res?.$meta?.status;

      if (status === 200 || status === 201) {
        toast.show({ message: "Draft saved successfully",  type: "info" });
        history.replace(nextLocation);
        setCurrentLocation(nextLocation);
        setNextLocation(null);
      } else {
        toast.show({ message: "There was an error saving your draft", type: "error" });
        setNextLocation(null);
      }
    }
  }, [nextLocation]);

  useEffect(() => {
    const unListen = history.listen((location) => {

      if (isFF(FF_OPTIC_7)) {
        const selected = window.Htx?.annotationStore?.selected;
        const newLocation = location.pathname;
        const hasChanges = !!selected?.history.undoIdx;

        if (hasChanges && newLocation !== currentLocation) {
          setNextLocation(newLocation);
          history.replace(currentLocation || "/");
        } else {
          setCurrentLocation(newLocation);
        }
      }
    });

    return () => unListen();
  }, [currentLocation]);

  return <></>;
};
