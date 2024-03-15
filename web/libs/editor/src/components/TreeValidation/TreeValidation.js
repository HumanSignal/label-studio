import { inject, observer } from "mobx-react";
import { getEnv } from "mobx-state-tree";
import { PropTypes } from "prop-types";
import React from "react";

import { ErrorMessage } from "../ErrorMessage/ErrorMessage";

export const TreeValidation = inject("store")(
  observer(({ store, errors }) => {
    return (
      <div className="ls-errors">
        {errors.map((error, index) => (
          <ErrorMessage
            key={`error-${index}`}
            error={getEnv(store).messages[error.error](error)}
          />
        ))}
      </div>
    );
  }),
);

TreeValidation.propTypes = {
  errors: PropTypes.array.isRequired,
};
